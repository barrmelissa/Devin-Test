// The one place integration config/secrets are read. Values come from .env (see .env.example).
// In production these would come from a secrets manager (e.g. Azure Key Vault / AWS Secrets Manager).
function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const integrationConfig = {
  mode: env("INTEGRATIONS_MODE", "mock") as "mock" | "live",
  kycVendor: { url: env("KYC_VENDOR_API_URL"), apiKey: env("KYC_VENDOR_API_KEY") },
  payments: { url: env("PAYMENTS_API_URL"), apiKey: env("PAYMENTS_API_KEY") },
  slack: { webhookUrl: env("SLACK_WEBHOOK_URL"), defaultChannel: env("SLACK_DEFAULT_CHANNEL", "#ops") },
};
