import { can } from "@/foundation/access";
import { defineApp } from "@/foundation/registry";
import { featureFlagsAttention } from "./attention";
import { featureFlagsHelp } from "./help";
import { APP_ID, FeatureFlagEntity } from "./entity";
import { FlagDetail } from "./screens/FlagDetail";
import { FlagList } from "./screens/FlagList";
import { NewFlag } from "./screens/NewFlag";
import { PendingChanges } from "./screens/PendingChanges";
import { RequestProdChange } from "./screens/RequestProdChange";

export const featureFlagsApp = defineApp({
  id: APP_ID,
  name: "Feature-flag admin",
  description: "Toggle flags per environment. Prod changes go through a change request with maker-checker approval.",
  canAccess: (user) => can(user, "read", { entity: FeatureFlagEntity }),
  help: featureFlagsHelp,
  attention: featureFlagsAttention,
  render: async ({ user, path, searchParams }) => {
    if (path.length === 0) return await FlagList({ user, searchParams });
    if (path[0] === "new") return await NewFlag({ user, searchParams });
    if (path[0] === "pending") return await PendingChanges({ user, searchParams });
    if (path[1] === "request") return await RequestProdChange({ user, id: path[0], searchParams });
    return await FlagDetail({ user, id: path[0], searchParams });
  },
});
