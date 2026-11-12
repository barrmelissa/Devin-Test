import { can } from "@/foundation/access";
import { canPerformTransition } from "@/foundation/attention";
import { listRecords, type RefundRequest, type User } from "@/foundation/data";
import type { Principal } from "@/foundation/identity/types";
import { appHref, type AttentionItem } from "@/foundation/registry";
import { APP_ID, RefundEntity, refundWorkflow } from "./entity";
import { formatMoney, needsApproval } from "./service";

type RefundWithRequester = RefundRequest & { requestedBy: Pick<User, "name"> };

/** Over-threshold refunds the user may approve, and failed refunds for roles that process refunds. */
export async function refundsAttention(user: Principal): Promise<AttentionItem[]> {
  if (!can(user, "read", { entity: RefundEntity })) return [];
  const refunds = (await listRecords(user, RefundEntity, {
    where: { status: { in: ["submitted", "failed"] } },
    include: { requestedBy: true },
  })) as RefundWithRequester[];
  return refunds.flatMap((r): AttentionItem[] => {
    const amount = formatMoney(r.refundAmountCents, r.currency);
    const base = { id: r.id, href: appHref(APP_ID, r.id) };
    if (r.status === "submitted" && needsApproval(r.refundAmountCents) && canPerformTransition(user, RefundEntity, r, "approve")) {
      return [{ ...base, title: `Approve refund: ${amount} for ${r.customerName}`, detail: `Requested by ${r.requestedBy.name}`, priority: "medium", since: r.createdAt }];
    }
    // Failed refunds have no next workflow step; they go to whoever can process refunds.
    const canProcess = can(user, "transition", { entity: RefundEntity, record: r }) && refundWorkflow.transitions.process_succeeded.roles.includes(user.role);
    if (r.status === "failed" && canProcess) {
      return [{ ...base, title: `Failed refund: ${amount} for ${r.customerName}`, detail: r.providerMessage ?? "Payment provider declined", priority: "high", since: r.processedAt ?? r.updatedAt }];
    }
    return [];
  });
}
