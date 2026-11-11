import type { AuditEntry } from "../audit/query";
import { humanize } from "./StatusBadge";

const IGNORED = new Set(["updatedAt", "createdAt", "id"]);

function show(v: unknown) {
  if (v === null || v === undefined || v === "") return "∅";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

export function changedFields(entry: Pick<AuditEntry, "before" | "after">) {
  const before = entry.before ?? {};
  const after = entry.after ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => !IGNORED.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ field: k, from: entry.before ? before[k] : undefined, to: after[k] }));
}

export function AuditTrail({ entries, showEntity = false }: { entries: AuditEntry[]; showEntity?: boolean }) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">No audit entries.</p>;
  return (
    <ol className="divide-y divide-slate-100 text-sm">
      {entries.map((e) => (
        <li key={e.id} className="py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">{humanize(e.action)}</span>
            <span className="text-slate-500">by {e.actorName} ({e.actorRole})</span>
            {showEntity && <span className="text-slate-500">· {e.app} / {e.entityType} {e.entityId.slice(-6)}</span>}
            <time className="ml-auto text-xs text-slate-400">{e.createdAt.toLocaleString()}</time>
          </div>
          {e.action === "create" ? (
            <p className="mt-1 text-xs text-slate-500">Record created.</p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
              {changedFields(e).map((c) => (
                <li key={c.field}><code>{c.field}</code>: {show(c.from)} → {show(c.to)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
