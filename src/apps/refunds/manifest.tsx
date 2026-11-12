import { can } from "@/foundation/access";
import { defineApp } from "@/foundation/registry";
import { refundsAttention } from "./attention";
import { refundsHelp } from "./help";
import { APP_ID, RefundEntity } from "./entity";
import { Detail } from "./screens/Detail";
import { List } from "./screens/List";
import { New } from "./screens/New";

export const refundsApp = defineApp({
  id: APP_ID,
  name: "Refunds dashboard",
  description: "Request, approve and process customer refunds, with auto-approval under the threshold and maker-checker above it.",
  canAccess: (user) => can(user, "read", { entity: RefundEntity }),
  help: refundsHelp,
  attention: refundsAttention,
  render: async ({ user, path, searchParams }) =>
    path.length === 0
      ? await List({ user, searchParams })
      : path[0] === "new"
        ? await New({ user, searchParams })
        : await Detail({ user, id: path[0], searchParams }),
});
