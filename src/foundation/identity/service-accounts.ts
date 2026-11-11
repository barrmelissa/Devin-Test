import { createHash, timingSafeEqual } from "node:crypto";
import type { Principal } from "./types";

/**
 * Machine callers of app APIs (POST /api/<app>/<route>). Each authenticates with a bearer token
 * from the environment and acts as a fixed principal, so its writes are access-checked and
 * audited like a person's. In production: per-client OAuth credentials or mTLS, tokens in a vault.
 */
const SERVICE_ACCOUNTS: (Principal & { tokenEnv: string })[] = [
  { id: "svc_onboarding", name: "Onboarding system", role: "integration", tokenEnv: "ONBOARDING_SERVICE_TOKEN" },
];

const digest = (s: string) => createHash("sha256").update(s).digest();

export function principalForToken(token: string): Principal | null {
  const presented = digest(token);
  for (const { tokenEnv, ...principal } of SERVICE_ACCOUNTS) {
    const expected = process.env[tokenEnv];
    if (expected && timingSafeEqual(presented, digest(expected))) return principal;
  }
  return null;
}
