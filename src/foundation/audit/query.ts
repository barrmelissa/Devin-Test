import { assertCan } from "../access/can";
import { maskRecord } from "../access/masking";
import { db } from "../db";
import { getEntityDef } from "../data/entities";
import type { Principal } from "../identity/types";

export type AuditEntry = {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  app: string;
  entityType: string;
  entityId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: Date;
};

export type AuditFilters = { app?: string; actorId?: string; entityType?: string; entityId?: string; take?: number };

type Row = Awaited<ReturnType<typeof db.auditLog.findMany>>[number];

function toEntry(viewer: Principal, row: Row): AuditEntry {
  const def = getEntityDef(row.entityType);
  const parse = (s: string | null) => {
    if (!s) return null;
    const obj = JSON.parse(s) as Record<string, unknown>;
    // Sensitive fields are already masked before storage; masking again here is a safety net.
    return def ? maskRecord(viewer, def.policy as never, obj) : obj;
  };
  return { ...row, before: parse(row.before), after: parse(row.after) };
}

/** Global audit log. Admins and auditors only. */
export async function listAuditEntries(viewer: Principal, filters: AuditFilters = {}): Promise<AuditEntry[]> {
  assertCan(viewer, "audit:read");
  const rows = await db.auditLog.findMany({
    where: {
      app: filters.app || undefined,
      actorId: filters.actorId || undefined,
      entityType: filters.entityType || undefined,
      entityId: filters.entityId || undefined,
    },
    orderBy: { createdAt: "desc" },
    take: filters.take ?? 200,
  });
  return rows.map((r) => toEntry(viewer, r));
}

/** Distinct values for audit page filters. */
export async function auditFilterOptions(viewer: Principal) {
  assertCan(viewer, "audit:read");
  const [apps, actors, types] = await Promise.all([
    db.auditLog.findMany({ distinct: ["app"], select: { app: true } }),
    db.auditLog.findMany({ distinct: ["actorId"], select: { actorId: true, actorName: true } }),
    db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);
  return { apps: apps.map((a) => a.app), actors, entityTypes: types.map((t) => t.entityType) };
}

/** Internal: history for one record. The data layer's getRecordHistory checks record access first. */
export async function historyFor(viewer: Principal, entityType: string, entityId: string): Promise<AuditEntry[]> {
  const rows = await db.auditLog.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => toEntry(viewer, r));
}
