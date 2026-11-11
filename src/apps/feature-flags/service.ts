import { assertCan } from "@/foundation/access";
import { assertTransition } from "@/foundation/approvals";
import { createFromInput, getRecord, getRecordHistory, listRecords, transitionRecord, updateRecord, type FeatureFlag, type User } from "@/foundation/data";
import { ForbiddenError, TransitionError, ValidationError } from "@/foundation/errors";
import { parseInput } from "@/foundation/forms";
import type { Principal } from "@/foundation/identity/types";
import { getAdapters } from "@/foundation/integrations";
import { FLAG_KEY_PATTERN, RELEASES_CHANNEL } from "./config";
import { APP_ID, FeatureFlagEntity, flagWorkflow } from "./entity";
import { NEW_FLAG_FIELDS, PROD_CHANGE_FIELDS } from "./fields";

// Feature-flag business rules. All reads and writes go through the foundation helpers, so every
// change is access-checked and writes exactly one audit entry with before/after values.

type UserRef = Pick<User, "id" | "name"> | null;
export type FlagWithUsers = FeatureFlag & { lastChangedBy: UserRef; prodChangeRequestedBy: UserRef };

const include = { lastChangedBy: true, prodChangeRequestedBy: true };

export function prodState(enabled: boolean | null | undefined, rolloutPercent: number | null | undefined) {
  const pct = rolloutPercent ?? 0;
  if (enabled) return `On (${pct}%)`;
  return pct > 0 ? `Off (${pct}% when on)` : "Off";
}

export async function listFlags(user: Principal, filters: { team?: string; change?: string } = {}) {
  return listRecords(user, FeatureFlagEntity, {
    where: {
      ...(filters.team ? { ownerTeam: filters.team } : {}),
      ...(filters.change ? { prodChangeStatus: filters.change } : {}),
    },
    include,
    orderBy: { key: "asc" },
  }) as Promise<FlagWithUsers[]>;
}

export async function listPendingProdChanges(user: Principal) {
  return listRecords(user, FeatureFlagEntity, {
    where: { prodChangeStatus: "pending" },
    include,
    orderBy: { prodChangeRequestedAt: "asc" },
  }) as Promise<FlagWithUsers[]>;
}

export async function getFlag(user: Principal, id: string) {
  return getRecord(user, FeatureFlagEntity, id, { include }) as Promise<FlagWithUsers>;
}

export function getFlagHistory(user: Principal, id: string) {
  return getRecordHistory(user, FeatureFlagEntity, id);
}

/** "New flag" form. New flags start off in every environment with 0% prod rollout. */
export async function createFlag(user: Principal, input: Record<string, unknown>) {
  return createFromInput(user, FeatureFlagEntity, NEW_FLAG_FIELDS, input, {
    build: async (v) => {
      const key = String(v.key);
      if (!FLAG_KEY_PATTERN.test(key)) {
        throw new ValidationError(`Key "${key}" must be lowercase snake_case (e.g. new_checkout_flow).`);
      }
      // The unique index on key is the backstop if two creates race.
      if ((await listRecords(user, FeatureFlagEntity, { where: { key }, take: 1 })).length > 0) {
        throw new ValidationError(`A flag with key "${key}" already exists.`);
      }
      return { key, description: String(v.description), ownerTeam: String(v.ownerTeam), lastChangedById: user.id, lastChangedAt: new Date() };
    },
  });
}

const ENV_FIELD = { dev: "devEnabled", staging: "stagingEnabled" } as const;

/** Dev and staging changes apply immediately. Prod never goes through here. */
export async function setEnvironment(user: Principal, id: string, environment: string, enabled: boolean) {
  if (environment === "prod") {
    throw new ForbiddenError("Prod cannot be changed directly. Request a prod change; it applies after a release manager approves it.");
  }
  if (environment !== "dev" && environment !== "staging") throw new ValidationError(`Unknown environment "${environment}".`);
  const field = ENV_FIELD[environment];
  return updateRecord(user, FeatureFlagEntity, id, {}, {
    action: `toggle_${environment}`,
    patch: (current) => {
      if (current[field] === enabled) throw new ValidationError(`${current.key} is already ${enabled ? "on" : "off"} in ${environment}.`);
      return { [field]: enabled, lastChangedById: user.id, lastChangedAt: new Date() };
    },
  });
}

/** Creates the flag's prod change request (maker). Prod values are untouched until approval. */
export async function requestProdChange(user: Principal, id: string, input: Record<string, unknown>) {
  const current = await getFlag(user, id);
  assertCan(user, "transition", { entity: FeatureFlagEntity, record: current });
  assertTransition(user, flagWorkflow, current, "request");
  const v = parseInput(PROD_CHANGE_FIELDS, input);
  const enabled = v.enabled === "on";
  const rolloutPercent = Number(v.rolloutPercent);
  if (current.prodEnabled === enabled && current.prodRolloutPercent === rolloutPercent) {
    throw new ValidationError(`Prod is already ${prodState(enabled, rolloutPercent)}; nothing to change.`);
  }
  return transitionRecord(user, FeatureFlagEntity, id, "request", {
    pendingProdEnabled: enabled,
    pendingProdRolloutPercent: rolloutPercent,
    prodChangeReason: String(v.reason),
    prodChangeRequestedAt: new Date(),
  });
}

/**
 * Checker approves: push to the flag service, then apply the requested prod values in the same
 * audited transition. The transition is checked before the push, so a blocked approver (wrong
 * role, own request, not pending) never reaches the flag service. If the push fails nothing is
 * applied and the request stays pending.
 */
export async function approveProdChange(user: Principal, id: string) {
  const current = await getFlag(user, id);
  assertCan(user, "transition", { entity: FeatureFlagEntity, record: current });
  assertTransition(user, flagWorkflow, current, "approve");
  if (current.pendingProdEnabled == null || current.pendingProdRolloutPercent == null) {
    throw new TransitionError("This change request has no requested prod values.");
  }
  const enabled = current.pendingProdEnabled;
  const rolloutPercent = current.pendingProdRolloutPercent;
  const requestedBy = current.prodChangeRequestedBy?.name ?? "unknown";
  const pushed = await getAdapters().flagService.applyChange({
    key: current.key, environment: "prod", enabled, rolloutPercent, requestedBy, approvedBy: user.name,
  });
  const updated = await transitionRecord(user, FeatureFlagEntity, id, "approve", {
    prodEnabled: enabled,
    prodRolloutPercent: rolloutPercent,
    pendingProdEnabled: null,
    pendingProdRolloutPercent: null,
    flagServiceChangeId: pushed.changeId,
    lastChangedById: user.id,
    lastChangedAt: pushed.appliedAt,
  });
  await getAdapters().notifications.send({
    app: APP_ID,
    entityId: id,
    channel: RELEASES_CHANNEL,
    message: `Prod flag change applied: ${current.key} ${prodState(current.prodEnabled, current.prodRolloutPercent)} → ${prodState(enabled, rolloutPercent)} (requested by ${requestedBy}, approved by ${user.name}).`,
  });
  return updated;
}

export async function rejectProdChange(user: Principal, id: string) {
  return transitionRecord(user, FeatureFlagEntity, id, "reject", { pendingProdEnabled: null, pendingProdRolloutPercent: null });
}

export async function decideProdChange(user: Principal, id: string, decision: string) {
  if (decision === "approve") return approveProdChange(user, id);
  if (decision === "reject") return rejectProdChange(user, id);
  throw new TransitionError(`Unknown transition "${decision}".`);
}
