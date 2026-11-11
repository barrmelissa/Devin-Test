import { notFound } from "next/navigation";
import { findApp } from "@/apps";
import { ForbiddenError, NotFoundError } from "@/foundation/errors";
import { getCurrentUser } from "@/foundation/identity";

type Props = {
  params: Promise<{ app: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

// Single catch-all route: every registered app is served from /apps/<id>/...
export default async function AppPage({ params, searchParams }: Props) {
  const { app: appId, path = [] } = await params;
  const app = findApp(appId);
  if (!app) notFound();
  const user = await getCurrentUser();
  try {
    return await app.render({ user, path, searchParams: await searchParams });
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof NotFoundError) {
      return (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-medium">{e instanceof ForbiddenError ? "Access denied" : "Not found"}</p>
          <p className="mt-1">{e.message}</p>
        </div>
      );
    }
    throw e;
  }
}
