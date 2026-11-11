import { assertCan } from "@/foundation/access";
import { assertTransition } from "@/foundation/approvals";
import { createFromInput, getRecord, getRecordHistory, listRecords, transitionRecord, updateRecord, type RefundRequest, type User } from "@/foundation/data";
import { TransitionError, ValidationError, errorMessage } from "@/foundation/errors";
import type { Principal } from "@/foundation/identity/types";
import { getAdapters } from "@/foundation/integrations";
import { AUTO_APPROVE_LIMIT_CENTS, SLACK_CHANNEL } from "./config";
import { APP_ID, MANUAL_TRANSITIONS, REFUND_REASONS, RefundEntity, refundWorkflow } from "./entity";
import { REFUND_FIELDS } from "./fields";

// Refunds business logic. Everything goes through foundation helpers, so access control
// and audit logging are applied automatically.

export type RefundWithUsers = RefundRequest & {
  requestedBy: Pick<User, "id" | "name">;
  approvedBy: Pick<User, "id" | "name"> | null;
};

export const toCents = (dollars: number) => Math.round(dollars * 100);
export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
export const needsApproval = (refundAmountCents: number) => refundAmountCents > AUTO_APPROVE_LIMIT_CENTS;
export const reasonLabel = (reason: string) => REFUND_REASONS[reason as keyof typeof REFUND_REASONS] ?? reason;

const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const noteLine = (user: Principal, text: string) => `[${user.name}, ${stamp()}] ${text}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function listRefunds(user: Principal, filters: { status?: string; reason?: string } = {}) {
  return listRecords(user, RefundEntity, {
    where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.reason ? { reason: filters.reason } : {}) },
    include: { requestedBy: true, approvedBy: true },
    orderBy: { createdAt: "desc" },
  }) as Promise<RefundWithUsers[]>;
}

/** Dashboard tiles. "Processed this week" = processed in the last 7 days. */
export async function refundSummary(user: Principal, now = new Date()) {
  const all = await listRecords(user, RefundEntity);
  const since = now.getTime() - WEEK_MS;
  return {
    pendingApproval: all.filter((r) => r.status === "submitted").length,
    processedThisWeek: all.filter((r) => r.status === "processed" && r.processedAt && r.processedAt.getTime() >= since).length,
    failed: all.filter((r) => r.status === "failed").length,
  };
}

export async function getRefund(user: Principal, id: string) {
  return getRecord(user, RefundEntity, id, { include: { requestedBy: true, approvedBy: true } }) as Promise<RefundWithUsers>;
}

export function getRefundHistory(user: Principal, id: string) {
  return getRecordHistory(user, RefundEntity, id);
}

async function notify(refund: RefundRequest, message: string) {
  await getAdapters().notifications.send({ app: APP_ID, entityId: refund.id, message, channel: SLACK_CHANNEL });
}

/**
 * "New refund request". Creating is the submit step (the requester is the maker). Refunds at or
 * under AUTO_APPROVE_LIMIT_CENTS are then auto-approved in a second audited transition.
 */
export async function createRefund(user: Principal, input: Record<string, unknown>) {
  const created = await createFromInput(user, RefundEntity, REFUND_FIELDS, input, {
    build: (v) => {
      const originalAmountCents = toCents(Number(v.originalAmount));
      const refundAmountCents = toCents(Number(v.refundAmount));
      if (refundAmountCents <= 0) throw new ValidationError("Refund amount must be greater than 0.");
      if (refundAmountCents > originalAmountCents) throw new ValidationError("Refund amount cannot exceed the original charge.");
      return {
        customerName: String(v.customerName),
        transactionId: String(v.transactionId),
        originalAmountCents,
        refundAmountCents,
        currency: String(v.currency),
        reason: String(v.reason),
        notes: v.notes ? noteLine(user, String(v.notes)) : "",
        requestedById: user.id,
      };
    },
  });
  if (needsApproval(created.refundAmountCents)) return created;
  const approved = await transitionRecord(user, RefundEntity, created.id, "auto_approve", { autoApproved: true });
  await notify(approved, `Refund of ${formatMoney(approved.refundAmountCents)} for ${approved.customerName} was auto-approved (≤ ${formatMoney(AUTO_APPROVE_LIMIT_CENTS)}).`);
  return approved;
}

/** Approve / reject from the detail page. Service-driven transitions can't be triggered directly. */
export async function transitionRefund(user: Principal, id: string, transition: string) {
  if (!(MANUAL_TRANSITIONS as readonly string[]).includes(transition)) {
    throw new TransitionError(`"${transition}" can't be triggered directly.`);
  }
  const updated = await transitionRecord(user, RefundEntity, id, transition, transition === "approve" ? { approvedById: user.id } : {});
  if (transition === "approve") {
    await notify(updated, `Refund of ${formatMoney(updated.refundAmountCents)} for ${updated.customerName} was approved by ${user.name}.`);
  }
  return updated;
}

/**
 * "Process refund": checks the caller may process this refund, calls the payments provider,
 * then records the result with one audited transition (processed or failed).
 */
export async function processRefund(user: Principal, id: string) {
  const current = await getRecord(user, RefundEntity, id);
  assertCan(user, "transition", { entity: RefundEntity, record: current });
  assertTransition(user, refundWorkflow, current, "process_succeeded");

  let result: { status: "succeeded" | "failed"; providerRefundId: string; message?: string };
  try {
    result = await getAdapters().payments.refund({
      paymentId: current.transactionId,
      amountCents: current.refundAmountCents,
      currency: current.currency,
      reason: reasonLabel(current.reason),
    });
  } catch (e) {
    result = { status: "failed", providerRefundId: "", message: errorMessage(e) };
  }
  const ok = result.status === "succeeded";
  const updated = await transitionRecord(user, RefundEntity, id, ok ? "process_succeeded" : "process_failed", {
    providerStatus: result.status,
    providerRefundId: result.providerRefundId || null,
    providerMessage: result.message ?? (ok ? "Refund issued" : "Refund failed"),
    processedAt: new Date(),
  });
  if (!ok) {
    await notify(updated, `Refund of ${formatMoney(updated.refundAmountCents)} for ${updated.customerName} FAILED: ${updated.providerMessage}.`);
  }
  return updated;
}

export async function addNote(user: Principal, id: string, text: string) {
  const note = text.trim();
  if (!note) throw new ValidationError("Note cannot be empty.");
  return updateRecord(user, RefundEntity, id, {}, {
    action: "add_note",
    patch: (current) => ({ notes: `${current.notes ? `${current.notes}\n` : ""}${noteLine(user, note)}` }),
  });
}
