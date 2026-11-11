import { assertCan, rowScopeWhere } from "../access/can";
import { maskRecord } from "../access/masking";
import { assertTransition } from "../approvals/workflow";
import { historyFor } from "../audit/query";
import { writeAuditEntry } from "../audit/writer";
import { db, type Tx } from "../db";
import { NotFoundError, TransitionError } from "../errors";
import type { Principal } from "../identity/types";
import type { EntityDef } from "./entities";

/**
 * The only way apps read and write data. Every helper:
 *  1. checks access with can() (role + row scope),
 *  2. masks sensitive fields for the caller,
 *  3. for mutations, writes exactly one AuditLog entry in the same transaction.
 */

type Rec = Record<string, unknown> & { id: string };
type Delegate = {
  findMany(args: object): Promise<Rec[]>;
  findUnique(args: object): Promise<Rec | null>;
  create(args: object): Promise<Rec>;
  update(args: object): Promise<Rec>;
};

function delegate(client: Tx, entity: EntityDef<never>): Delegate {
  return (client as unknown as Record<string, Delegate>)[entity.model];
}

function asDef<T>(entity: EntityDef<T>) {
  return entity as unknown as EntityDef<never>;
}

export type ListOptions = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];
  include?: Record<string, boolean>;
  take?: number;
};

export async function listRecords<T>(user: Principal, entity: EntityDef<T>, opts: ListOptions = {}): Promise<T[]> {
  assertCan(user, "read", { entity });
  const where = { AND: [opts.where ?? {}, rowScopeWhere(user, entity)] };
  const rows = await delegate(db, asDef(entity)).findMany({ where, orderBy: opts.orderBy, include: opts.include, take: opts.take });
  return rows.map((r) => maskRecord(user, entity.policy, r as unknown as T));
}

async function loadRaw<T>(client: Tx, entity: EntityDef<T>, id: string): Promise<Rec> {
  const row = await delegate(client, asDef(entity)).findUnique({ where: { id } });
  if (!row) throw new NotFoundError(`${entity.type} ${id} not found.`);
  return row;
}

export async function getRecord<T>(
  user: Principal,
  entity: EntityDef<T>,
  id: string,
  opts: { include?: Record<string, boolean> } = {},
): Promise<T> {
  const row = await delegate(db, asDef(entity)).findUnique({ where: { id }, include: opts.include });
  if (!row) throw new NotFoundError(`${entity.type} ${id} not found.`);
  assertCan(user, "read", { entity, record: row as unknown as T });
  return maskRecord(user, entity.policy, row as unknown as T);
}

export async function getRecordHistory<T>(user: Principal, entity: EntityDef<T>, id: string) {
  await getRecord(user, entity, id); // enforces read access to the record
  return historyFor(user, entity.type, id);
}

export async function createRecord<T>(
  user: Principal,
  entity: EntityDef<T>,
  data: Partial<T>,
  opts: { action?: string } = {},
): Promise<T> {
  assertCan(user, "create", { entity });
  const wf = entity.workflow;
  const payload: Record<string, unknown> = { ...data };
  if (wf && payload[wf.statusField] === undefined) payload[wf.statusField] = wf.initial;
  if (wf && payload[wf.statusField] !== wf.initial) {
    throw new TransitionError(`New ${entity.type} records must start in "${wf.initial}".`);
  }
  const created = await db.$transaction(async (tx) => {
    const row = await delegate(tx, asDef(entity)).create({ data: payload });
    await writeAuditEntry(tx, {
      actor: user, app: entity.app, entityType: entity.type, entityId: row.id,
      action: opts.action ?? "create", before: null, after: row,
    });
    return row;
  });
  return maskRecord(user, entity.policy, created as unknown as T);
}

export type UpdateOptions<T> = {
  /** Audit action name, e.g. "add_note". Defaults to "update". */
  action?: string;
  /** Reject the update unless the record is currently in one of these statuses. */
  requireStatus?: readonly string[];
  /** Compute the patch from the current (unmasked) record, e.g. to append to a field. */
  patch?: (current: T) => Partial<T>;
};

export async function updateRecord<T>(
  user: Principal,
  entity: EntityDef<T>,
  id: string,
  data: Partial<T>,
  opts: UpdateOptions<T> = {},
): Promise<T> {
  const updated = await db.$transaction(async (tx) => {
    const before = await loadRaw(tx, entity, id);
    assertCan(user, "update", { entity, record: before as unknown as T });
    const wf = entity.workflow;
    if (wf) {
      if (wf.statusField in data || wf.submitterField in data) {
        throw new TransitionError("Status changes must go through transitionRecord().");
      }
      if (opts.requireStatus && !opts.requireStatus.includes(String(before[wf.statusField]))) {
        throw new TransitionError(`Cannot ${opts.action ?? "update"} while status is "${before[wf.statusField]}".`);
      }
    }
    const patch = { ...data, ...(opts.patch ? opts.patch(before as unknown as T) : {}) };
    const after = await delegate(tx, asDef(entity)).update({ where: { id }, data: patch });
    await writeAuditEntry(tx, {
      actor: user, app: entity.app, entityType: entity.type, entityId: id,
      action: opts.action ?? "update", before, after,
    });
    return after;
  });
  return maskRecord(user, entity.policy, updated as unknown as T);
}

/**
 * Moves a record through its app's workflow. Rejects unknown/invalid transitions,
 * roles not granted the transition, and maker-checker violations. Audited as "status_change:<name>".
 */
export async function transitionRecord<T>(
  user: Principal,
  entity: EntityDef<T>,
  id: string,
  transition: string,
  data: Partial<T> = {},
): Promise<T> {
  const wf = entity.workflow;
  if (!wf) throw new TransitionError(`${entity.type} has no workflow.`);
  const updated = await db.$transaction(async (tx) => {
    const before = await loadRaw(tx, entity, id);
    assertCan(user, "transition", { entity, record: before as unknown as T });
    const t = assertTransition(user, wf, before, transition);
    const patch: Record<string, unknown> = { ...data, [wf.statusField]: t.to };
    if (t.submits) patch[wf.submitterField] = user.id;
    const after = await delegate(tx, asDef(entity)).update({ where: { id }, data: patch });
    await writeAuditEntry(tx, {
      actor: user, app: entity.app, entityType: entity.type, entityId: id,
      action: `status_change:${transition}`, before, after,
    });
    return after;
  });
  return maskRecord(user, entity.policy, updated as unknown as T);
}

export { defineEntity, type EntityDef } from "./entities";
export type { KycCase, User } from "./models";
