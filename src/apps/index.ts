import type { AppManifest } from "@/foundation/registry";
import { kycApp } from "./kyc/manifest";
import { refundsApp } from "./refunds/manifest";

// App registry: add one line per app. Registered apps appear in the left nav and are routed at /apps/<id>.
export const apps: AppManifest[] = [kycApp, refundsApp];

export function findApp(id: string) {
  return apps.find((a) => a.id === id);
}
