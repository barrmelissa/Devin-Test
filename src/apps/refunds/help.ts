import type { AppHelp } from "@/foundation/registry";
import { AUTO_APPROVE_LIMIT_CENTS, SLACK_CHANNEL } from "./config";

const limit = `$${AUTO_APPROVE_LIMIT_CENTS / 100}`;

export const refundsHelp: AppHelp = {
  roles: ["support_agent", "finance_approver", "admin", "auditor"],
  steps: [
    "Support agents raise a refund with New refund request.",
    `Refunds of ${limit} or less are approved automatically; larger ones wait for finance.`,
    "A finance approver who didn't request the refund approves or rejects it.",
    "Process refund sends an approved refund to the payment provider and saves the result.",
    "Click a summary tile to filter the table; each refund's page shows its audit history.",
  ],
  demo: [
    { as: "Priya (support)", tryThis: `Create a refund over ${limit}: it waits for approval. One under ${limit} is approved at once.` },
    { as: "Grace (admin)", tryThis: "Open \"Contoso Fitness\". She requested it, so Approve is disabled." },
    { as: "Fatima (finance)", tryThis: "Approve \"Contoso Fitness\" and Process refund. Process \"Diego Alvarez\" to see a payment failure." },
  ],
  hints: {
    approve: `Approves a refund over the ${limit} auto-approve limit so it can be processed, and posts to ${SLACK_CHANNEL}.`,
    process: `Sends the refund to the payment provider (mock). It becomes Processed or Failed, the provider's result is saved on the refund, and failures post to ${SLACK_CHANNEL}.`,
  },
};
