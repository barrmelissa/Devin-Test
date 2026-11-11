import { definePolicy, maskLast4 } from "@/foundation/access";
import { defineWorkflow } from "@/foundation/approvals";
import { defineEntity, type KycCase } from "@/foundation/data";

export const APP_ID = "kyc";

export const KYC_STATUSES = ["new", "in_review", "pending_approval", "approved", "rejected", "escalated"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const kycWorkflow = defineWorkflow<KycStatus>({
  statuses: KYC_STATUSES,
  initial: "new",
  transitions: {
    start_review: { label: "Start review", from: ["new"], to: "in_review", roles: ["analyst", "senior_reviewer", "admin"], variant: "primary" },
    submit: { label: "Submit for approval", from: ["in_review"], to: "pending_approval", roles: ["analyst", "senior_reviewer", "admin"], submits: true, variant: "primary" },
    escalate: { label: "Escalate", from: ["in_review"], to: "escalated", roles: ["analyst", "senior_reviewer", "admin"] },
    resume: { label: "Return to review", from: ["escalated"], to: "in_review", roles: ["senior_reviewer", "admin"] },
    send_back: { label: "Send back to analyst", from: ["pending_approval"], to: "in_review", roles: ["senior_reviewer", "admin"] },
    approve: { label: "Approve", from: ["pending_approval"], to: "approved", roles: ["senior_reviewer", "admin"], requiresChecker: true, variant: "primary" },
    reject: { label: "Reject", from: ["pending_approval"], to: "rejected", roles: ["senior_reviewer", "admin"], requiresChecker: true, variant: "danger" },
  },
});

const assignedToMe = {
  where: (user: { id: string }) => ({ assignedAnalystId: user.id }),
  matches: (user: { id: string }, c: KycCase) => c.assignedAnalystId === user.id,
};

export const kycPolicy = definePolicy<KycCase>({
  roles: {
    analyst: { actions: ["read", "update", "transition"], scope: assignedToMe },
    senior_reviewer: { actions: ["read", "create", "update", "transition"], unmaskedFields: ["taxId"] },
    admin: { actions: ["read", "create", "update", "transition"], unmaskedFields: ["taxId"] },
    auditor: { actions: ["read"] },
    // Onboarding system service account (POST /api/kyc/intake): create only, tax ID masked in responses.
    integration: { actions: ["create"] },
  },
  sensitiveFields: { taxId: maskLast4 },
});

export const KycCaseEntity = defineEntity<KycCase>({
  app: APP_ID,
  type: "KycCase",
  model: "kycCase",
  policy: kycPolicy,
  workflow: kycWorkflow,
});
