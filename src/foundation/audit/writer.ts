import type { Tx } from "../db";
import type { Principal } from "../identity/types";

// Foundation-internal: only the data helpers call this, so apps get audit logging without remembering to.
export async function writeAuditEntry(
  tx: Tx,
  entry: {
    actor: Principal;
    app: string;
    entityType: string;
    entityId: string;
    action: string;
    before: unknown;
    after: unknown;
  },
) {
  return tx.auditLog.create({
    data: {
      actorId: entry.actor.id,
      actorName: entry.actor.name,
      actorRole: entry.actor.role,
      app: entry.app,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      before: entry.before == null ? null : JSON.stringify(entry.before),
      after: entry.after == null ? null : JSON.stringify(entry.after),
    },
  });
}
