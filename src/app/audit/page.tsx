import "@/apps"; // ensures app entities are registered so audit entries can be masked
import { auditFilterOptions, listAuditEntries } from "@/foundation/audit";
import { can } from "@/foundation/access";
import { getCurrentUser } from "@/foundation/identity";
import { AuditTrail, FilterBar, PageHeader } from "@/foundation/ui";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!can(user, "audit:read")) {
    return <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Access denied: the audit log is visible to admin and auditor roles.</div>;
  }
  const sp = await searchParams;
  const [entries, options] = await Promise.all([
    listAuditEntries(user, { app: sp.app, actorId: sp.actor, entityType: sp.entityType, entityId: sp.entityId }),
    auditFilterOptions(user),
  ]);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Append-only record of every create, update and status change across apps. Newest first (latest 200)." />
      <FilterBar
        values={{ app: sp.app, actor: sp.actor, entityType: sp.entityType }}
        filters={[
          { name: "app", label: "App", options: options.apps.map((a) => ({ value: a, label: a })) },
          { name: "actor", label: "Actor", options: options.actors.map((a) => ({ value: a.actorId, label: a.actorName })) },
          { name: "entityType", label: "Entity", options: options.entityTypes.map((t) => ({ value: t, label: t })) },
        ]}
      />
      {sp.entityId && <p className="text-sm text-slate-600">Filtered to entity <code>{sp.entityId}</code></p>}
      <div className="rounded-lg border border-slate-200 bg-white px-4">
        <AuditTrail entries={entries} showEntity />
      </div>
    </>
  );
}
