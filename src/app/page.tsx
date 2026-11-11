import Link from "next/link";
import { apps } from "@/apps";
import { ROLES } from "@/foundation/access";
import { getCurrentUser } from "@/foundation/identity";
import { appHref } from "@/foundation/registry";
import { PageHeader } from "@/foundation/ui";

export default async function Home() {
  const user = await getCurrentUser();
  const visible = apps.filter((a) => a.canAccess(user));
  return (
    <>
      <PageHeader title={`Welcome, ${user.name}`} subtitle={`Role: ${ROLES[user.role].label}`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((a) => (
          <Link key={a.id} href={appHref(a.id)} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300">
            <h2 className="font-semibold">{a.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{a.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
