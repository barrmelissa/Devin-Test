import { ForbiddenError, MakerCheckerError, TransitionError } from "../errors";
import type { Principal } from "../identity/types";
import type { Role } from "../access/roles";

export type TransitionDef = {
  label: string;
  from: readonly string[];
  to: string;
  roles: readonly Role[];
  /** Marks the actor as the "maker": their id is stored in the workflow's submitterField. */
  submits?: boolean;
  /** Maker-checker: the recorded submitter may not perform this transition. */
  requiresChecker?: boolean;
  variant?: "primary" | "danger" | "default";
};

export type Workflow<S extends string = string> = {
  statuses: readonly S[];
  initial: S;
  statusField: string;
  submitterField: string;
  transitions: Record<string, TransitionDef & { from: readonly S[]; to: S }>;
};

export function defineWorkflow<S extends string>(
  wf: Omit<Workflow<S>, "statusField" | "submitterField"> & Partial<Pick<Workflow<S>, "statusField" | "submitterField">>,
): Workflow<S> {
  const full: Workflow<S> = { statusField: "status", submitterField: "submittedById", ...wf };
  for (const [name, t] of Object.entries(full.transitions)) {
    for (const s of [...t.from, t.to]) {
      if (!full.statuses.includes(s)) throw new Error(`Workflow transition "${name}" references unknown status "${s}"`);
    }
  }
  return full;
}

type Rec = Record<string, unknown>;

export type TransitionCheck =
  | { ok: true; name: string; transition: TransitionDef }
  | { ok: false; name: string; error: Error };

export function checkTransition(user: Principal, wf: Workflow, record: Rec, name: string): TransitionCheck {
  const t = wf.transitions[name];
  const current = String(record[wf.statusField]);
  if (!t) return { ok: false, name, error: new TransitionError(`Unknown transition "${name}".`) };
  if (!t.from.includes(current)) {
    return { ok: false, name, error: new TransitionError(`Cannot "${t.label}" from status "${current}".`) };
  }
  if (!t.roles.includes(user.role)) {
    return { ok: false, name, error: new ForbiddenError(`Role ${user.role} cannot "${t.label}".`) };
  }
  if (t.requiresChecker && record[wf.submitterField] === user.id) {
    return { ok: false, name, error: new MakerCheckerError(`Maker-checker: ${user.name} submitted this and cannot "${t.label}" it.`) };
  }
  return { ok: true, name, transition: t };
}

export function assertTransition(user: Principal, wf: Workflow, record: Rec, name: string): TransitionDef {
  const res = checkTransition(user, wf, record, name);
  if (!res.ok) throw res.error;
  return res.transition;
}

/** Transitions from the record's current status that this user's role is granted, with maker-checker blocks flagged. */
export function availableTransitions(user: Principal, wf: Workflow, record: Rec) {
  const current = String(record[wf.statusField]);
  return Object.entries(wf.transitions)
    .filter(([, t]) => t.from.includes(current) && t.roles.includes(user.role))
    .map(([name, t]) => {
      const res = checkTransition(user, wf, record, name);
      return { name, ...t, allowed: res.ok, reason: res.ok ? undefined : res.error.message };
    });
}
