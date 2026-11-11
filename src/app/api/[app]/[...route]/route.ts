import { findApp } from "@/apps";
import { handleApiRequest } from "@/foundation/api";

type Ctx = { params: Promise<{ app: string; route: string[] }> };

// Single catch-all API route: every app's endpoints are served from /api/<id>/<route>.
async function handle(req: Request, { params }: Ctx) {
  const { app: appId, route } = await params;
  return handleApiRequest(req, findApp(appId)?.api?.[route.join("/")]);
}

export const POST = handle;
export const GET = handle;
