import { can } from "@/foundation/access";
import { defineApp } from "@/foundation/registry";
import { APP_ID, KycCaseEntity } from "./entity";
import { CaseDetail } from "./screens/CaseDetail";
import { Queue } from "./screens/Queue";

export const kycApp = defineApp({
  id: APP_ID,
  name: "KYC review queue",
  description: "Review customer KYC cases, run sanctions/ID checks, and approve or reject with maker-checker.",
  canAccess: (user) => can(user, "read", { entity: KycCaseEntity }),
  // Screens are awaited here so access errors surface to the shell's error handling.
  render: async ({ user, path, searchParams }) =>
    path.length === 0 ? await Queue({ user, searchParams }) : await CaseDetail({ user, id: path[0], searchParams }),
});
