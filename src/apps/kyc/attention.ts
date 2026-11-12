import { can } from "@/foundation/access";
import { canPerformTransition } from "@/foundation/attention";
import { listRecords, type KycCase, type User } from "@/foundation/data";
import type { Principal } from "@/foundation/identity/types";
import { appHref, type AttentionItem } from "@/foundation/registry";
import { APP_ID, KycCaseEntity } from "./entity";
import { riskBand } from "./service";

type CaseWithSubmitter = KycCase & { submittedBy: Pick<User, "name"> | null };

/** Pending approvals the user may decide (high if risk >= 70), and in-review cases assigned to them. */
export async function kycAttention(user: Principal): Promise<AttentionItem[]> {
  if (!can(user, "read", { entity: KycCaseEntity })) return [];
  const cases = (await listRecords(user, KycCaseEntity, {
    where: { status: { in: ["pending_approval", "in_review"] } },
    include: { submittedBy: true },
  })) as CaseWithSubmitter[];
  return cases.flatMap((c): AttentionItem[] => {
    const high = riskBand(c.riskScore) === "high";
    const base = { id: c.id, since: c.updatedAt, href: appHref(APP_ID, c.id) };
    if (c.status === "pending_approval" && canPerformTransition(user, KycCaseEntity, c, "approve")) {
      return [{ ...base, title: `Approve KYC case: ${c.customerName}`, detail: `Risk ${c.riskScore}, submitted by ${c.submittedBy?.name ?? "unknown"}`, priority: high ? "high" : "medium" }];
    }
    if (c.status === "in_review" && c.assignedAnalystId === user.id && canPerformTransition(user, KycCaseEntity, c, "submit")) {
      return [{ ...base, title: `Finish review: ${c.customerName}`, detail: `Risk ${c.riskScore}, assigned to you`, priority: high ? "medium" : "low" }];
    }
    return [];
  });
}
