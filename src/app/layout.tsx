import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { apps } from "@/apps";
import { can } from "@/foundation/access";
import { getCurrentUser, listUsers } from "@/foundation/identity";
import { switchUser } from "@/foundation/identity/actions";
import { appHref } from "@/foundation/registry";
import { UserSwitcher } from "@/foundation/ui/UserSwitcher";

export const metadata = { title: "Internal Tools" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [user, users] = await Promise.all([getCurrentUser(), listUsers()]);
  const visibleApps = apps.filter((a) => a.canAccess(user));
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="flex items-center justify-between bg-slate-900 px-6 py-3 text-white">
          <Link href="/" className="font-semibold">Internal Tools</Link>
          <UserSwitcher users={users} currentId={user.id} action={switchUser} />
        </header>
        <div className="flex">
          <nav className="min-h-[calc(100vh-52px)] w-56 shrink-0 border-r border-slate-200 bg-white p-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Apps</p>
            <ul className="space-y-1">
              {visibleApps.map((a) => (
                <li key={a.id}><Link href={appHref(a.id)} className="block rounded px-2 py-1 hover:bg-slate-100">{a.name}</Link></li>
              ))}
            </ul>
            {can(user, "audit:read") && (
              <>
                <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Platform</p>
                <ul><li><Link href="/audit" className="block rounded px-2 py-1 hover:bg-slate-100">Audit log</Link></li></ul>
              </>
            )}
          </nav>
          <main className="flex-1 space-y-4 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
