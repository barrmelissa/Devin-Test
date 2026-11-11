import { beforeEach, describe, expect, it } from "vitest";
import { transitionCase } from "@/apps/kyc/service";
import { MakerCheckerError, TransitionError } from "@/foundation/errors";
import { ForbiddenError } from "@/foundation/errors";
import { ana, db, grace, makeCase, omar, raj, resetDb, sofia } from "./helpers";

beforeEach(resetDb);

describe("maker-checker", () => {
  it("the submitter of a case cannot approve it", async () => {
    const c = await makeCase({ status: "in_review", vendorResult: "pass", assignedAnalystId: ana.id });
    await transitionCase(sofia, c.id, "submit", { recommendation: "approve" });
    expect((await db.kycCase.findUniqueOrThrow({ where: { id: c.id } })).submittedById).toBe(sofia.id);

    await expect(transitionCase(sofia, c.id, "approve")).rejects.toBeInstanceOf(MakerCheckerError);
    await expect(transitionCase(sofia, c.id, "reject")).rejects.toBeInstanceOf(MakerCheckerError);

    const approved = await transitionCase(raj, c.id, "approve");
    expect(approved.status).toBe("approved");
  });

  it("applies to admins too", async () => {
    const c = await makeCase({ status: "pending_approval", submittedById: grace.id });
    await expect(transitionCase(grace, c.id, "approve")).rejects.toBeInstanceOf(MakerCheckerError);
  });

  it("sends a mock Slack notification on approval/rejection", async () => {
    const c = await makeCase({ status: "pending_approval", submittedById: ana.id, customerName: "Acme" });
    await transitionCase(sofia, c.id, "reject");
    const n = await db.notification.findMany({ where: { entityId: c.id } });
    expect(n).toHaveLength(1);
    expect(n[0].message).toContain("Acme");
    expect(n[0].message).toContain("rejected");
  });
});

describe("status transitions", () => {
  it("invalid status transitions are rejected server-side", async () => {
    const c = await makeCase({ status: "new" });
    await expect(transitionCase(sofia, c.id, "approve")).rejects.toBeInstanceOf(TransitionError);
    await expect(transitionCase(ana, c.id, "escalate")).rejects.toBeInstanceOf(TransitionError);
    await expect(transitionCase(ana, c.id, "teleport")).rejects.toBeInstanceOf(TransitionError);

    const done = await makeCase({ status: "approved" });
    await expect(transitionCase(sofia, done.id, "reject")).rejects.toBeInstanceOf(TransitionError);
    expect((await db.kycCase.findUniqueOrThrow({ where: { id: c.id } })).status).toBe("new");
  });

  it("roles not granted a transition are rejected", async () => {
    const c = await makeCase({ status: "pending_approval", submittedById: omar.id });
    await expect(transitionCase(ana, c.id, "approve")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("valid path new -> in_review -> pending_approval works for an analyst", async () => {
    const c = await makeCase({ status: "new", vendorResult: "pass" });
    expect((await transitionCase(ana, c.id, "start_review")).status).toBe("in_review");
    expect((await transitionCase(ana, c.id, "submit", { recommendation: "approve" })).status).toBe("pending_approval");
  });
});
