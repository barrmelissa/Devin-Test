import { integrationConfig } from "./config";
import { MockFlagServiceAdapter } from "./mocks/flag-service";
import { MockKycVendorAdapter } from "./mocks/kyc-vendor";
import { MockNotificationsAdapter } from "./mocks/notifications";
import { MockPaymentsAdapter } from "./mocks/payments";
import type { Adapters } from "./types";

let adapters: Adapters | undefined;

/** Apps get external systems only through here. Swap mocks for real adapters based on config. */
export function getAdapters(): Adapters {
  if (!adapters) {
    if (integrationConfig.mode !== "mock") {
      throw new Error("Only mock integrations are implemented in this prototype (set INTEGRATIONS_MODE=mock).");
    }
    adapters = {
      kycVendor: new MockKycVendorAdapter(),
      payments: new MockPaymentsAdapter(),
      notifications: new MockNotificationsAdapter(integrationConfig.slack.defaultChannel),
      flagService: new MockFlagServiceAdapter(),
    };
  }
  return adapters;
}

/** Test hook: replace adapters (e.g. with spies). */
export function setAdapters(next: Adapters | undefined) {
  adapters = next;
}

export type * from "./types";
