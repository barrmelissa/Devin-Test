import { defineApi } from "@/foundation/api";
import { appHref } from "@/foundation/registry";
import { APP_ID } from "./entity";
import { intakeSignup } from "./service";

export const kycApi = defineApi({
  // POST /api/kyc/intake: the onboarding system (bearer token) or an admin's "Simulate new signup" button.
  intake: {
    method: "POST",
    sessionPermission: "integrations:simulate",
    handler: async ({ user, body }) => {
      const c = await intakeSignup(user, body);
      return {
        status: 201,
        body: {
          id: c.id,
          status: c.status,
          vendorResult: c.vendorResult,
          href: appHref(APP_ID, c.id),
          message: `New case for ${c.customerName} (vendor check: ${c.vendorResult}).`,
        },
      };
    },
  },
});
