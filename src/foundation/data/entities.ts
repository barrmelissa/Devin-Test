import type { Prisma } from "@prisma/client";
import type { EntityPolicy } from "../access/policy";
import type { Workflow } from "../approvals/workflow";

type FoundationModel = "user" | "auditLog" | "notification";
export type AppModel = Exclude<Uncapitalize<Prisma.ModelName>, FoundationModel>;

export type EntityDef<T = unknown> = {
  app: string;
  /** Entity type name used in audit logs, e.g. "KycCase". */
  type: string;
  /** Prisma model delegate name, e.g. "kycCase". */
  model: AppModel;
  policy: EntityPolicy<T>;
  workflow?: Workflow;
};

const registry = new Map<string, EntityDef<unknown>>();

export function defineEntity<T>(def: EntityDef<T>): EntityDef<T> {
  registry.set(def.type, def as EntityDef<unknown>);
  return def;
}

export function getEntityDef(type: string): EntityDef<unknown> | undefined {
  return registry.get(type);
}
