import { cookies } from "next/headers";
import { isRole } from "../access/roles";
import { db } from "../db";
import type { Principal } from "./types";

/**
 * Identity stub. In production this is where Okta / Entra ID SSO plugs in:
 * resolve the session from the OIDC token and map IdP groups to roles.
 */
export const USER_COOKIE = "uid";
const DEFAULT_USER_ID = "u_ana";

function toPrincipal(u: { id: string; name: string; role: string }): Principal {
  if (!isRole(u.role)) throw new Error(`User ${u.id} has unknown role ${u.role}`);
  return { id: u.id, name: u.name, role: u.role };
}

export async function getCurrentUser(): Promise<Principal> {
  const store = await cookies();
  return userForSession(store.get(USER_COOKIE)?.value);
}

/** Resolves the session cookie value to a user (stub: the cookie is the user id). */
export async function userForSession(cookieValue: string | undefined): Promise<Principal> {
  const id = cookieValue ?? DEFAULT_USER_ID;
  const user = (await db.user.findUnique({ where: { id } })) ?? (await db.user.findFirst({ orderBy: { name: "asc" } }));
  if (!user) throw new Error("No users found. Run `npm run setup`.");
  return toPrincipal(user);
}

export async function getUserById(id: string): Promise<Principal | null> {
  const u = await db.user.findUnique({ where: { id } });
  return u ? toPrincipal(u) : null;
}

/** Directory lookup for display and assignment pickers (non-sensitive fields only). */
export async function listUsers(filter: { role?: string } = {}): Promise<Principal[]> {
  const users = await db.user.findMany({ where: { role: filter.role }, orderBy: { name: "asc" } });
  return users.map(toPrincipal);
}

export type { Principal } from "./types";
