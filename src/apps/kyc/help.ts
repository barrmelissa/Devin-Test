import type { AppHelp } from "@/foundation/registry";

export const kycHelp: AppHelp = {
  roles: ["analyst", "senior_reviewer", "admin", "auditor"],
  steps: [
    "Open the queue. Analysts see only the cases assigned to them; other roles see every case.",
    "Open a case, click Start review, then Run vendor check (mock sanctions and ID check).",
    "Add notes, pick a recommendation and Submit for approval.",
    "A senior reviewer or admin who didn't submit the case approves or rejects it.",
    "Senior reviewers and admins can add cases with New case; admins can also Simulate new signup.",
  ],
  demo: [
    { as: "Ana (analyst)", tryThis: "Open \"Daniel Okafor\", run the vendor check and submit it for approval." },
    { as: "Sofia (senior reviewer)", tryThis: "Open \"Chen Wei\". She submitted it, so Approve is disabled." },
    { as: "Raj (senior reviewer)", tryThis: "Approve \"Chen Wei\", then check the case history and the Audit log." },
  ],
  hints: {
    submit: "Sends the case to a senior reviewer with your recommendation. You become its submitter, so you can't approve it yourself.",
    approve: "Marks the customer as KYC-approved and posts a Slack message. The audit log records who approved it and the before and after values.",
  },
};
