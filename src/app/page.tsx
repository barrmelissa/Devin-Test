import Link from "next/link";
import { apps } from "@/apps";
import { ROLES } from "@/foundation/access";
import { collectAttention, formatAge } from "@/foundation/attention";
import { getCurrentUser } from "@/foundation/identity";
import { launcherCards, type AttentionPriority } from "@/foundation/registry";
import { PageHeader, buttonClass } from "@/foundation/ui";

const PRIORITY_TONES: Record<AttentionPriority, string> = {
  high: "bg-rose-100 text-rose-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

// App launcher, driven entirely by the registry (src/apps/index.ts).
export default async function Home() {
  const user = await getCurrentUser();
  const [attention, cards] = [await collectAttention(user, apps), launcherCards(user, apps)];
  const now = new Date();
  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle={`Role: ${ROLES[user.role].label}`} />

      <section aria-labelledby="attention-heading" className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="attention-heading" className="font-semibold">Needs your attention</h2>
          {attention.total > 0 && (
            <p className="text-xs text-slate-500" data-testid="attention-counts">
              {attention.counts.map((c) => `${c.appName}: ${c.count}`).join(" · ")}
              {attention.total > attention.items.length && ` (showing ${attention.items.length} of ${attention.total})`}
            </p>
          )}
        </div>
        {attention.items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">You&apos;re all caught up. Nothing is waiting on you right now.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {attention.items.map((i) => (
              <li key={`${i.appId}:${i.id}`}>
                <Link href={i.href} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                  <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${PRIORITY_TONES[i.priority]}`}>{i.priority}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{i.title}</span>
                    <span className="block truncate text-xs text-slate-500">{i.appName}{i.detail && ` · ${i.detail}`}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500" title={i.since.toLocaleString()}>{formatAge(i.since, now)} ago</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="apps-heading">
        <h2 id="apps-heading" className="mb-2 font-semibold">Apps</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.id}
              data-testid={`app-card-${c.id}`}
              aria-disabled={!c.enabled}
              className={`flex flex-col rounded-lg border border-slate-200 p-4 ${c.enabled ? "bg-white" : "bg-slate-50 opacity-60"}`}
            >
              <h3 className="font-semibold">{c.name}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-500">{c.description}</p>
              <p className="mt-3 text-xs text-slate-500">For: {c.roles.join(", ")}</p>
              <div className="mt-3">
                {c.enabled ? (
                  <Link href={c.href} className={buttonClass("primary")}>Open</Link>
                ) : (
                  <span className="inline-block rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">No access</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
