import { beforeEach, describe, expect, it } from "vitest";
import { kycApi } from "@/apps/kyc/api";
import { createCase, intakeSignup } from "@/apps/kyc/service";
import { handleApiRequest } from "@/foundation/api";
import { ForbiddenError, ValidationError } from "@/foundation/errors";
import type { Principal } from "@/foundation/identity/types";
import { ana, db, grace, maya, resetDb, sofia } from "./helpers";

beforeEach(resetDb);

const onboarding: Principal = { id: "svc_onboarding", name: "Onboarding system", role: "integration" };
const input = { customerName: "Nordic Pay AB", country: "SE", taxId: "SE556677889901", riskScore: 35 };

async function auditRows() {
  return (await db.auditLog.findMany()).map((r) => ({ ...r, after: r.after ? JSON.parse(r.after) : null }));
}

describe("manual case creation", () => {
  it("analysts and auditors cannot create cases (server-side); nothing is written", async () => {
    for (const u of [ana, maya]) {
      await expect(createCase(u, input)).rejects.toBeInstanceOf(ForbiddenError);
      // Access is checked before validation, so even invalid input gets Forbidden.
      await expect(createCase(u, {})).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(await db.kycCase.count()).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("senior reviewer create writes exactly one audit entry with before=null and masked tax ID", async () => {
    const c = await createCase(sofia, { ...input, assignedAnalystId: ana.id, notes: "Referred by partner bank" });
    expect(c).toMatchObject({ status: "new", assignedAnalystId: ana.id, riskScore: 35, taxId: input.taxId });
    expect(c.notes).toContain(`[${sofia.name}`);
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "create", actorId: sofia.id, actorRole: "senior_reviewer", entityId: c.id, before: null });
    expect(rows[0].after).toMatchObject({ customerName: input.customerName, status: "new" });
    expect(rows[0].after.taxId).not.toContain("SE5566");
  });

  it("admin can create; the assigned analyst then sees the case", async () => {
    const c = await createCase(grace, { ...input, assignedAnalystId: ana.id });
    expect(await db.auditLog.count({ where: { entityId: c.id } })).toBe(1);
    const stored = await db.kycCase.findUniqueOrThrow({ where: { id: c.id } });
    expect(stored.taxId.startsWith("enc:v1:")).toBe(true);
  });

  it.each([
    [{ ...input, customerName: " " }, /Customer name is required/],
    [{ ...input, taxId: undefined }, /Tax ID is required/],
    [{ ...input, riskScore: 101 }, /between 0 and 100/],
    [{ ...input, riskScore: -1 }, /between 0 and 100/],
    [{ ...input, riskScore: "12.5" }, /whole number/],
    [{ ...input, riskScore: "abc" }, /whole number/],
    [{ ...input, country: "XX" }, /Country has an invalid value/],
    [{ ...input, assignedAnalystId: sofia.id }, /Assigned analyst has an invalid value/],
  ])("rejects invalid input %#", async (bad, msg) => {
    await expect(createCase(sofia, bad)).rejects.toThrow(msg);
    await expect(createCase(sofia, bad)).rejects.toBeInstanceOf(ValidationError);
    expect(await db.kycCase.count()).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("cannot set status or submitter on create", async () => {
    const c = await createCase(sofia, { ...input, status: "approved", submittedById: sofia.id });
    expect(c.status).toBe("new");
    expect(c.submittedById).toBeNull();
  });
});

describe("automated intake", () => {
  it("creates a new case with the vendor check already run and exactly one audit entry", async () => {
    const c = await intakeSignup(onboarding, input);
    expect(c).toMatchObject({ status: "new", vendorResult: "pass", assignedAnalystId: null });
    expect(c.taxId).not.toBe(input.taxId); // service account sees it masked
    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "intake", actorId: "svc_onboarding", actorRole: "integration", before: null });
    expect(rows[0].after).toMatchObject({ vendorResult: "pass", status: "new" });
  });

  it("vendor check flags sanctioned countries", async () => {
    const c = await intakeSignup(onboarding, { ...input, country: "RU" });
    expect(c.vendorResult).toBe("fail");
  });

  it("analysts cannot run intake", async () => {
    await expect(intakeSignup(ana, input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await db.kycCase.count()).toBe(0);
  });
});

describe("POST /api/kyc/intake", () => {
  const url = "http://localhost:3000/api/kyc/intake";
  const call = (headers: Record<string, string>, body: unknown = input) =>
    handleApiRequest(new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), kycApi.intake);
  const session = (uid: string) => ({ cookie: `uid=${uid}`, origin: "http://localhost:3000", host: "localhost:3000" });

  it("accepts the onboarding service token (201) and audits as the service account", async () => {
    const res = await call({ authorization: "Bearer test-onboarding-token" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ status: "new", vendorResult: "pass" });
    expect(await db.auditLog.findMany({ where: { entityId: body.id } })).toMatchObject([{ actorId: "svc_onboarding", action: "intake" }]);
  });

  it("rejects a wrong token (401) and writes nothing", async () => {
    const res = await call({ authorization: "Bearer nope" });
    expect(res.status).toBe(401);
    expect(await db.kycCase.count()).toBe(0);
  });

  it("allows an admin session (Simulate new signup) but not senior reviewers or analysts", async () => {
    expect((await call(session(grace.id))).status).toBe(201);
    expect((await call(session(sofia.id))).status).toBe(403);
    expect((await call(session(ana.id))).status).toBe(403);
    expect(await db.kycCase.count()).toBe(1);
  });

  it("rejects cross-origin session requests (403)", async () => {
    const res = await call({ ...session(grace.id), origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(await db.kycCase.count()).toBe(0);
  });

  it("returns 400 for invalid input", async () => {
    const res = await call({ authorization: "Bearer test-onboarding-token" }, { ...input, riskScore: 150 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/between 0 and 100/);
  });
});
