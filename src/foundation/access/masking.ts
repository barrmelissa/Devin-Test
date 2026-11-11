import type { Principal } from "../identity/types";
import type { EntityPolicy, Masker } from "./policy";

export const maskLast4: Masker = (value) => {
  const s = value == null ? "" : String(value);
  return s.length <= 4 ? "••••" : `${"•".repeat(Math.min(s.length - 4, 8))}${s.slice(-4)}`;
};

export function canSeeField<T>(user: Principal, policy: EntityPolicy<T>, field: keyof T & string): boolean {
  if (!policy.sensitiveFields?.[field]) return true;
  return policy.roles[user.role]?.unmaskedFields?.includes(field) ?? false;
}

export function maskRecord<T>(user: Principal, policy: EntityPolicy<T>, record: T): T {
  const sensitive = policy.sensitiveFields;
  if (!sensitive) return record;
  const out: Record<string, unknown> = { ...(record as Record<string, unknown>) };
  for (const [field, masker] of Object.entries(sensitive) as [keyof T & string, Masker][]) {
    if (field in out && !canSeeField(user, policy, field)) out[field] = masker(out[field]);
  }
  return out as T;
}
