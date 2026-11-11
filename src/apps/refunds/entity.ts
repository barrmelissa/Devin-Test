import { definePolicy } from "@/foundation/access";
import { defineWorkflow } from "@/foundation/approvals";
import { defineEntity, type RefundRequest } from "@/foundation/data";

export const APP_ID = "refunds";

export const REFUND_STATUSES = ["submitted", "approved", "rejected", "processed", "failed"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_REASONS = {
  duplicate_charge: "Duplicate charge",
  fraud: "Fraud",
  service_issue: "Service issue",
  other: "Other",
} as const;

export const refundWorkflow = defineWorkflow<RefundStatus>({
  statuses: REFUND_STATUSES,
  initial: "submitted",
  // The requester is the maker: creating a refund request is the submit step.
  submitterField: "requestedById",
  transitions: {
    // Run only by the service, on create, when the amount is within AUTO_APPROVE_LIMIT_CENTS.
    auto_approve: { label: "Auto-approve", from: ["submitted"], to: "approved", roles: ["support_agent", "admin"] },
    approve: { label: "Approve", from: ["submitted"], to: "approved", roles: ["finance_approver", "admin"], requiresChecker: true, variant: "primary" },
    reject: { label: "Reject", from: ["submitted"], to: "rejected", roles: ["finance_approver", "admin"], requiresChecker: true, variant: "danger" },
    // "Process refund" calls PaymentsAdapter, then takes one of these based on the result.
    process_succeeded: { label: "Process refund", from: ["approved"], to: "processed", roles: ["finance_approver", "admin"] },
    process_failed: { label: "Process refund", from: ["approved"], to: "failed", roles: ["finance_approver", "admin"] },
  },
});

/** Transitions a user can trigger directly from the detail page (others are service-driven). */
export const MANUAL_TRANSITIONS = ["approve", "reject"] as const;

export const refundPolicy = definePolicy<RefundRequest>({
  roles: {
    support_agent: { actions: ["read", "create", "update", "transition"] },
    finance_approver: { actions: ["read", "update", "transition"] },
    admin: { actions: ["read", "create", "update", "transition"] },
    auditor: { actions: ["read"] },
  },
});

export const RefundEntity = defineEntity<RefundRequest>({
  app: APP_ID,
  type: "RefundRequest",
  model: "refundRequest",
  policy: refundPolicy,
  workflow: refundWorkflow,
});
