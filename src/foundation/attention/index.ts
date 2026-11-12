import { can } from "../access/can";
import { checkTransition } from "../approvals/workflow";
import type { EntityDef } from "../data/entities";
import type { Principal } from "../identity/types";
import type { AppManifest, AttentionItem, AttentionPriority } from "../registry";

const RANK: Record<AttentionPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * Whether the user may perform this workflow transition on this record right now: entity
 * `transition` permission with row scope, valid from-status, role, and maker-checker. The same
 * checks transitionRecord() enforces, so attention queries only surface items the user can act on.
 */
export function canPerformTransition<T>(user: Principal, entity: EntityDef<T>, record: T, transition: string): boolean {
  if (!entity.workflow) return false;
  if (!can(user, "transition", { entity, record })) return false;
  return checkTransition(user, entity.workflow, record as Record<string, unknown>, transition).ok;
}

export type AppAttentionItem = AttentionItem & { appId: string; appName: string };
export type AttentionSummary = {
  items: AppAttentionItem[];
  total: number;
  counts: { appId: string; appName: string; count: number }[];
};

export function sortAttention<T extends AttentionItem>(items: T[]): T[] {
  return [...items].sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.since.getTime() - b.since.getTime());
}

/** "Needs your attention": every accessible app's items, highest priority then oldest first. */
export async function collectAttention(user: Principal, apps: AppManifest[], { limit = 8 } = {}): Promise<AttentionSummary> {
  const perApp = await Promise.all(
    apps.filter((a) => a.canAccess(user)).map(async (a) => ({
      app: a,
      items: (await a.attention(user)).map((i) => ({ ...i, appId: a.id, appName: a.name })),
    })),
  );
  const all = sortAttention(perApp.flatMap((p) => p.items));
  return {
    items: all.slice(0, limit),
    total: all.length,
    counts: perApp.filter((p) => p.items.length > 0).map((p) => ({ appId: p.app.id, appName: p.app.name, count: p.items.length })),
  };
}

export function formatAge(since: Date, now = new Date()) {
  const mins = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
