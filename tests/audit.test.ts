import { beforeEach, describe, expect, it } from "vitest";
import { KycCaseEntity } from "@/apps/kyc/entity";
import { addNote, runVendorCheck, transitionCase } from "@/apps/kyc/service";
import { listAuditEntries } from "@/foundation/audit";
import { createRecord, updateRecord } from "@/foundation/data";
import { ForbiddenError, TransitionError } from "@/foundation/errors";
import { ana, auditCount, db, grace, makeCase, maya, resetDb, sofia } from "./helpers";

beforeEach(resetDb);

async function onlyEntry(entityId: string) {
  const rows = await db.auditLog.findMany({ where: { entityId } });
  expect(rows).toHaveLength(1);
  const r = rows[0];
  return { ...r, before: r.before ? JSON.parse(r.before) : null, after: r.after ? JSON.parse(r.after) : null };
}

describe("audit log", () => {
  it("create writes exactly one entry with before=null and after=record", async () => {
    const created = await createRecord(grace, KycCaseEntity, { customerName: "New Co", country: "US", riskScore: 10, taxId: "11-1111111" });
    const e = await onlyEntry((created as { id: string }).id);
    expect(e).toMatchObject({ action: "create", actorId: grace.id, actorRole: "admin", app: "kyc", entityType: "KycCase" });
    expect(e.before).toBeNull();
    expect(e.after).toMatchObject({ customerName: "New Co", status: "new" });
    expect(e.after.taxId).not.toContain("11-111");
  });

  it("update writes exactly one entry with correct before/after", async () => {
    const c = await makeCase({ notes: "" });
    await addNote(ana, c.id, "Called customer");
    const e = await onlyEntry(c.id);
    expect(e).toMatchObject({ action: "add_note", actorId: ana.id, actorName: ana.name, actorRole: "analyst" });
    expect(e.before.notes).toBe("");
    expect(e.after.notes).toContain("Called customer");
  });

  it("status change writes exactly one entry with correct before/after", async () => {
    const c = await makeCase({ status: "pending_approval", submittedById: ana.id });
    await transitionCase(sofia, c.id, "approve");
    const e = await onlyEntry(c.id);
    expect(e.action).toBe("status_change:approve");
    expect(e.before.status).toBe("pending_approval");
    expect(e.after.status).toBe("approved");
  });

  it("vendor check (adapter-driven update) writes exactly one entry", async () => {
    const c = await makeCase({ country: "RU" });
    await runVendorCheck(ana, c.id);
    const e = await onlyEntry(c.id);
    expect(e.action).toBe("vendor_check");
    expect(e.before.vendorResult).toBeNull();
    expect(e.after.vendorResult).toBe("fail");
  });

  it("each mutation in a sequence adds exactly one entry", async () => {
    const c = await makeCase({ status: "new" });
    await transitionCase(ana, c.id, "start_review");
    await runVendorCheck(ana, c.id);
    await addNote(ana, c.id, "ok");
    await transitionCase(ana, c.id, "submit", { recommendation: "approve" });
    await transitionCase(sofia, c.id, "approve");
    expect(await auditCount(c.id)).toBe(5);
  });

  it("rejected mutations write no audit entry", async () => {
    const c = await makeCase({ status: "new", assignedAnalystId: "t_omar" });
    await expect(addNote(ana, c.id, "x")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(transitionCase(sofia, c.id, "approve")).rejects.toBeInstanceOf(TransitionError);
    await expect(updateRecord(grace, KycCaseEntity, c.id, { status: "approved" })).rejects.toBeInstanceOf(TransitionError);
    expect(await auditCount(c.id)).toBe(0);
  });

  it("audit log is readable by admin and auditor only", async () => {
    await expect(listAuditEntries(maya)).resolves.toBeDefined();
    await expect(listAuditEntries(grace)).resolves.toBeDefined();
    await expect(listAuditEntries(ana)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(listAuditEntries(sofia)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
