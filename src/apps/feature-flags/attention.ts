import { can } from "@/foundation/access";
import { canPerformTransition } from "@/foundation/attention";
import type { Principal } from "@/foundation/identity/types";
import { appHref, type AttentionItem } from "@/foundation/registry";
import { APP_ID, FeatureFlagEntity } from "./entity";
import { listPendingProdChanges, prodState } from "./service";

/** Pending prod change requests the user may approve (never their own). */
export async function featureFlagsAttention(user: Principal): Promise<AttentionItem[]> {
  if (!can(user, "read", { entity: FeatureFlagEntity })) return [];
  const flags = await listPendingProdChanges(user);
  return flags
    .filter((f) => canPerformTransition(user, FeatureFlagEntity, f, "approve"))
    .map((f) => ({
      id: f.id,
      title: `Approve prod change: ${f.key}`,
      detail: `${prodState(f.prodEnabled, f.prodRolloutPercent)} → ${prodState(f.pendingProdEnabled, f.pendingProdRolloutPercent)}, requested by ${f.prodChangeRequestedBy?.name ?? "unknown"}`,
      priority: "medium" as const,
      since: f.prodChangeRequestedAt ?? f.updatedAt,
      href: appHref(APP_ID, f.id),
    }));
}
