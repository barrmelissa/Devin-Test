import { definePolicy } from "@/foundation/access";
import { defineWorkflow } from "@/foundation/approvals";
import { defineEntity, type FeatureFlag } from "@/foundation/data";

export const APP_ID = "feature-flags";

export const ENVIRONMENTS = ["dev", "staging", "prod"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

/**
 * The workflow tracks the flag's prod change request (one at a time). "none" means no request
 * has been made yet; approved/rejected record the last decision and allow a new request.
 */
export const PROD_CHANGE_STATUSES = ["none", "pending", "approved", "rejected"] as const;
export type ProdChangeStatus = (typeof PROD_CHANGE_STATUSES)[number];

export const flagWorkflow = defineWorkflow<ProdChangeStatus>({
  statuses: PROD_CHANGE_STATUSES,
  initial: "none",
  statusField: "prodChangeStatus",
  submitterField: "prodChangeRequestedById",
  transitions: {
    request: { label: "Request prod change", from: ["none", "approved", "rejected"], to: "pending", roles: ["engineer", "admin"], submits: true, variant: "primary" },
    approve: { label: "Approve", from: ["pending"], to: "approved", roles: ["release_manager", "admin"], requiresChecker: true, variant: "primary" },
    reject: { label: "Reject", from: ["pending"], to: "rejected", roles: ["release_manager", "admin"], requiresChecker: true, variant: "danger" },
  },
});

// No row scope (every role with access sees every flag) and no sensitive fields.
// Prod values are only written by the approve transition; see service.ts.
export const flagPolicy = definePolicy<FeatureFlag>({
  roles: {
    engineer: { actions: ["read", "create", "update", "transition"] },
    release_manager: { actions: ["read", "transition"] },
    admin: { actions: ["read", "create", "update", "transition"] },
    auditor: { actions: ["read"] },
  },
});

export const FeatureFlagEntity = defineEntity<FeatureFlag>({
  app: APP_ID,
  type: "FeatureFlag",
  model: "featureFlag",
  policy: flagPolicy,
  workflow: flagWorkflow,
});
