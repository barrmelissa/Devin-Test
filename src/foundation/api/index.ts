import { assertCan } from "../access/can";
import type { PlatformAction } from "../access/roles";
import { ForbiddenError, UnauthorizedError, ValidationError, errorMessage } from "../errors";
import { USER_COOKIE, userForSession } from "../identity";
import { principalForToken } from "../identity/service-accounts";
import type { Principal } from "../identity/types";

/**
 * App HTTP endpoints, served by the one foundation route /api/<app>/<route>.
 * Handlers get an authenticated principal and must do their work through @/foundation/data,
 * so API writes get the same access control and audit logging as screens.
 */
export type ApiContext = { user: Principal; via: "service" | "session"; body: Record<string, unknown> };
export type ApiResult = { status?: number; body: unknown };

export type ApiRoute = {
  method: "POST";
  /** Browser (session) callers also need this platform permission. Service accounts are checked by the entity policy only. */
  sessionPermission?: PlatformAction;
  handler: (ctx: ApiContext) => Promise<ApiResult>;
};

export function defineApi(routes: Record<string, ApiRoute>) {
  return routes;
}

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/**
 * Bearer token -> service account. Otherwise the user session, but only for same-origin requests
 * (route handlers don't get the Origin check that server actions do, so it's enforced here).
 */
export async function authenticateRequest(req: Request): Promise<Pick<ApiContext, "user" | "via">> {
  const auth = req.headers.get("authorization");
  if (auth) {
    const user = auth.startsWith("Bearer ") ? principalForToken(auth.slice(7).trim()) : null;
    if (!user) throw new UnauthorizedError("Invalid service token.");
    return { user, via: "service" };
  }
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new ForbiddenError("Cross-origin or missing Origin header; browser calls must be same-origin.");
  }
  return { user: await userForSession(readCookie(req.headers.get("cookie"), USER_COOKIE)), via: "session" };
}

function json(status: number, body: unknown) {
  return Response.json(body, { status });
}

export async function handleApiRequest(req: Request, route: ApiRoute | undefined): Promise<Response> {
  if (!route) return json(404, { error: "Not found." });
  if (req.method !== route.method) return json(405, { error: `Use ${route.method}.` });
  try {
    const caller = await authenticateRequest(req);
    if (caller.via === "session" && route.sessionPermission) assertCan(caller.user, route.sessionPermission);
    if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
      throw new ValidationError("Content-Type must be application/json.");
    }
    const body = await req.json().catch(() => {
      throw new ValidationError("Body must be valid JSON.");
    });
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ValidationError("Body must be a JSON object.");
    const result = await route.handler({ ...caller, body });
    return json(result.status ?? 200, result.body);
  } catch (e) {
    const status = typeof (e as { status?: unknown }).status === "number" ? (e as { status: number }).status : 500;
    if (status === 500) console.error(e);
    return json(status, { error: status === 500 ? "Internal error." : errorMessage(e) });
  }
}
