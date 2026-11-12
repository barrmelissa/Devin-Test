import type { AppHelp } from "@/foundation/registry";
import { RELEASES_CHANNEL } from "./config";

export const featureFlagsHelp: AppHelp = {
  roles: ["engineer", "release_manager", "admin", "auditor"],
  steps: [
    "Engineers add flags with New flag. New flags start off in every environment.",
    "Dev and staging toggles apply immediately.",
    "Prod never changes directly: use Request prod change with the new state, rollout and a reason.",
    "A release manager or admin who didn't make the request approves it on Pending prod changes.",
    "Each flag's page shows its change history from the audit log.",
  ],
  demo: [
    { as: "Nina (engineer)", tryThis: "Toggle a flag in staging, then request a prod change for it." },
    { as: "Grace (admin)", tryThis: "Open legacy_invoice_pdf. She requested the prod change, so Approve is disabled." },
    { as: "Elena (release manager)", tryThis: "Approve legacy_invoice_pdf on Pending prod changes, then check its history and the Audit log." },
  ],
  hints: {
    request: "Asks for a prod change (on or off, and rollout %) with a reason. Prod stays as it is until someone else approves the request.",
    approve: `Applies the requested change in prod through the flag service (mock) and posts to ${RELEASES_CHANNEL}.`,
  },
};
