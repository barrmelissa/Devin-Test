import Link from "next/link";
import { apps } from "@/apps";
import { ROLES } from "@/foundation/access";
import { getCurrentUser, listUsers } from "@/foundation/identity";
import { appHref, roleLabels } from "@/foundation/registry";
import { PageHeader } from "@/foundation/ui";

// Getting started. App sections come from each app's registry help, so new apps appear automatically.
export default async function GuidePage() {
  const [user, users] = await Promise.all([getCurrentUser(), listUsers()]);
  const byRole = Object.entries(ROLES)
    .map(([role, { label }]) => ({ label, names: users.filter((u) => u.role === role).map((u) => u.name.split(" ")[0]) }))
    .filter((r) => r.names.length > 0);

  return (
    <>
      <PageHeader title="Getting started" subtitle="A shared platform for internal tools, with governance built in." />

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">What this is</h2>
        <p>
          Every internal tool here (KYC reviews, refunds, feature flags, and the ones that come next) runs on one foundation. The
          foundation handles access control, audit logging, approvals and connections to outside systems, so each app gets them
          without writing them again. The <Link href="/" className="text-indigo-700 hover:underline">home page</Link> lists every app and what needs your attention.
        </p>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Switching users</h2>
        <p>
          This prototype has no real sign-in. Use <strong>Signed in as</strong> in the header to become any seeded user; the page reloads
          with that user&apos;s permissions. You are currently <strong>{user.name}</strong>. In production this is replaced by company SSO.
        </p>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {byRole.map((r) => <li key={r.label}><span className="font-medium">{r.label}:</span> {r.names.join(", ")}</li>)}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Demo path per app</h2>
        {apps.map((a) => (
          <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{a.name}</h3>
              <Link href={appHref(a.id)} className="text-indigo-700 hover:underline">Open</Link>
            </div>
            <p className="mt-1 text-slate-500">{a.description}</p>
            <p className="mt-2 text-xs text-slate-500">For: {roleLabels(a.help.roles).join(", ")}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">How to use it</h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5">{a.help.steps.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Try this</h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  {a.help.demo.map((d) => <li key={d.as + d.tryThis}>Switch to <strong>{d.as}</strong>. {d.tryThis}</li>)}
                </ol>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">How governance works</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Every action is permission-checked on the server.</strong> Hidden buttons are only a convenience; calling an action directly still fails if your role isn&apos;t allowed.</li>
          <li><strong>Every change is audited.</strong> Each create, edit and status change writes an audit entry (who, when, before and after) in the same database transaction. Admins and auditors can see them in the Audit log, and each record shows its own history.</li>
          <li><strong>Approvals use maker-checker.</strong> Whoever submits or requests something can&apos;t approve it, admins included.</li>
          <li><strong>Sensitive fields are masked and encrypted.</strong> For example, KYC tax IDs are encrypted at rest and masked for roles that don&apos;t need them.</li>
          <li><strong>The &quot;?&quot; next to key actions</strong> explains what the action does and who can do it.</li>
        </ul>
      </section>
    </>
  );
}
