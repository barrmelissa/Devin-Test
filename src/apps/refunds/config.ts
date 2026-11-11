// Refunds app configuration. Apps can't read process.env, so app-level settings live here.
/** Refunds at or under this amount (in cents) are auto-approved on submit. */
export const AUTO_APPROVE_LIMIT_CENTS = 50_000;
export const CURRENCY = "USD";
/** Mock Slack channel for refund approvals and failures (the foundation default is KYC's channel). */
export const SLACK_CHANNEL = "#refunds-ops";
