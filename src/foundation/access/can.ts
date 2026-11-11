import { ForbiddenError } from "../errors";
import type { Principal } from "../identity/types";
import type { EntityDef } from "../data/entities";
import { PLATFORM_PERMISSIONS, type EntityAction, type PlatformAction } from "./roles";

export type Resource<T = unknown> = { entity: EntityDef<T>; record?: T };

/**
 * The one access check. Platform actions take no resource; entity actions take
 * the entity definition and (optionally) the specific record for row-level scope.
 */
export function can(user: Principal, action: PlatformAction): boolean;
export function can<T>(user: Principal, action: EntityAction, resource: Resource<T>): boolean;
export function can<T>(user: Principal, action: PlatformAction | EntityAction, resource?: Resource<T>): boolean {
  if (!resource) {
    const allowed = PLATFORM_PERMISSIONS[action as PlatformAction] as readonly string[] | undefined;
    return allowed?.includes(user.role) ?? false;
  }
  const rolePolicy = resource.entity.policy.roles[user.role];
  if (!rolePolicy || !rolePolicy.actions.includes(action as EntityAction)) return false;
  if (resource.record !== undefined && rolePolicy.scope && !rolePolicy.scope.matches(user, resource.record)) return false;
  return true;
}

export function assertCan(user: Principal, action: PlatformAction): void;
export function assertCan<T>(user: Principal, action: EntityAction, resource: Resource<T>): void;
export function assertCan<T>(user: Principal, action: PlatformAction | EntityAction, resource?: Resource<T>): void {
  const ok = resource ? can(user, action as EntityAction, resource) : can(user, action as PlatformAction);
  if (!ok) {
    const what = resource ? `${action} ${resource.entity.type}` : action;
    throw new ForbiddenError(`${user.name} (${user.role}) is not allowed to ${what}.`);
  }
}

export function rowScopeWhere<T>(user: Principal, entity: EntityDef<T>): Record<string, unknown> {
  return entity.policy.roles[user.role]?.scope?.where(user) ?? {};
}
