import type { Principal } from "../identity/types";
import type { EntityAction, Role } from "./roles";

export type Masker = (value: unknown) => string;

export type RolePolicy<T> = {
  actions: EntityAction[];
  /** Row-level scope. Omit for "all rows". `where` filters lists in the DB; `matches` guards single records. */
  scope?: {
    where: (user: Principal) => Record<string, unknown>;
    matches: (user: Principal, record: T) => boolean;
  };
  /** Sensitive fields this role may see unmasked. */
  unmaskedFields?: (keyof T & string)[];
};

export type EntityPolicy<T> = {
  /** Roles not listed get no access at all. */
  roles: Partial<Record<Role, RolePolicy<T>>>;
  /** Fields masked for every role that does not list them in unmaskedFields. */
  sensitiveFields?: Partial<Record<keyof T & string, Masker>>;
};

export function definePolicy<T>(policy: EntityPolicy<T>): EntityPolicy<T> {
  return policy;
}
