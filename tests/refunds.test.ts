import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addNote, createRefund, getRefund, getRefundHistory, listRefunds, processRefund, refundSummary, transitionRefund, weekAgo } from "@/apps/refunds/service";
import { ForbiddenError, MakerCheckerError, TransitionError, ValidationError } from "@/foundation/errors";
import { getAdapters, setAdapters } from "@/foundation/integrations";
import { ana, auditCount, db, fatima, grace, makeRefund, marcus, maya, priya, sofia, tom } from "./helpers";

const valid = (overrides: Record<string, unknown> = {}) => ({
  customerName: "Jane Doe",
  transactionId: "txn_abc123",
  originalAmount: "900",
  refundAmount: "600",
  currency: "USD",
  reason: "service_issue",
  notes: "Customer called in.",
  ...overrides,
});

const audits = (entityId: string) => db.auditLog.findMany({ where: { entityId }, orderBy: { createdAt: "asc" } });

function spyPayments(result: { status: "succeeded" | "failed"; providerRefundId: string; message?: string } | Error) {
  const real = getAdapters();
  const refund = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  setAdapters({ ...real, payments: { getPayment: real.payments.getPayment, refund } });
  return refund;
}

beforeEach(async () => {
  const { resetDb } = await import("./helpers");
  await resetDb();
});
afterEach(() => setAdapters(undefined));

describe("refund validation", () => {
  it("rejects a refund larger than the original charge and writes nothing", async () => {
    await expect(createRefund(priya, valid({ originalAmount: "100", refundAmount: "100.01" }))).rejects.toThrow(/cannot exceed the original charge/);
    await expect(createRefund(priya, valid({ originalAmount: "100", refundAmount: "100.01" }))).rejects.toBeInstanceOf(ValidationError);
    expect(await db.refundRequest.count()).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("requires refund amount > 0, required fields and valid options", async () => {
    for (const bad of [
      { refundAmount: "0" },
      { refundAmount: "-5" },
      { customerName: "" },
      { transactionId: "" },
      { reason: "because" },
      { currency: "EUR" },
      { originalAmount: "abc" },
    ]) {
      await expect(createRefund(priya, valid(bad))).rejects.toBeInstanceOf(ValidationError);
    }
    expect(await db.refundRequest.count()).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("ignores status, approver and requester in the input", async () => {
    const r = await createRefund(priya, valid({ status: "processed", approvedById: fatima.id, requestedById: grace.id, autoApproved: "true" }));
    expect(r.status).toBe("submitted");
    expect(r.requestedById).toBe(priya.id);
    expect(r.approvedById).toBeNull();
    expect(r.autoApproved).toBe(false);
  });
});

describe("approval threshold", () => {
  it("a refund over $500 stays submitted and requires approval", async () => {
    const r = await createRefund(priya, valid({ refundAmount: "500.01" }));
    expect(r.status).toBe("submitted");
    expect(r.refundAmountCents).toBe(50001);
    expect((await audits(r.id)).map((a) => a.action)).toEqual(["create"]);
    expect(await db.notification.count({ where: { entityId: r.id } })).toBe(0);
  });

  it("a refund at or under $500 is auto-approved on submit, with one audit entry per mutation", async () => {
    const r = await createRefund(priya, valid({ refundAmount: "500" }));
    expect(r.status).toBe("approved");
    expect(r.autoApproved).toBe(true);
    expect(r.approvedById).toBeNull();
    const rows = await audits(r.id);
    expect(rows.map((a) => a.action)).toEqual(["create", "status_change:auto_approve"]);
    expect(rows.every((a) => a.actorId === priya.id)).toBe(true);
    expect(JSON.parse(rows[0].after!).status).toBe("submitted");
    expect(JSON.parse(rows[1].before!).status).toBe("submitted");
    expect(JSON.parse(rows[1].after!).status).toBe("approved");
    const n = await db.notification.findMany({ where: { entityId: r.id } });
    expect(n).toHaveLength(1);
    expect(n[0].message).toMatch(/auto-approved/);
  });

  it("auto_approve can't be triggered directly (e.g. to bypass the threshold)", async () => {
    const r = await makeRefund({ refundAmountCents: 90_000, requestedById: priya.id });
    await expect(transitionRefund(priya, r.id, "auto_approve")).rejects.toBeInstanceOf(TransitionError);
    expect((await getRefund(priya, r.id)).status).toBe("submitted");
    expect(await auditCount(r.id)).toBe(0);
  });
});

describe("maker-checker and roles", () => {
  it("the requester cannot approve or reject their own refund (admins included)", async () => {
    const r = await createRefund(grace, valid({ refundAmount: "750" }));
    await expect(transitionRefund(grace, r.id, "approve")).rejects.toBeInstanceOf(MakerCheckerError);
    await expect(transitionRefund(grace, r.id, "reject")).rejects.toBeInstanceOf(MakerCheckerError);
    expect(await auditCount(r.id)).toBe(1);

    const approved = await transitionRefund(fatima, r.id, "approve");
    expect(approved.status).toBe("approved");
    expect(approved.approvedById).toBe(fatima.id);
    const n = await db.notification.findMany({ where: { entityId: r.id } });
    expect(n.map((x) => x.message)).toEqual([expect.stringMatching(/approved by Fatima/)]);
  });

  it("support_agent cannot approve, reject or process (server-side)", async () => {
    const submitted = await makeRefund({ requestedById: marcus.id });
    for (const t of ["approve", "reject"]) {
      await expect(transitionRefund(priya, submitted.id, t)).rejects.toBeInstanceOf(ForbiddenError);
    }
    const approved = await makeRefund({ status: "approved", requestedById: marcus.id, approvedById: fatima.id });
    const refund = spyPayments({ status: "succeeded", providerRefundId: "re_1" });
    await expect(processRefund(priya, approved.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect(refund).not.toHaveBeenCalled();
    expect((await getRefund(priya, submitted.id)).status).toBe("submitted");
    expect(await auditCount(submitted.id)).toBe(0);
    expect(await auditCount(approved.id)).toBe(0);
  });

  it("finance_approver can approve but cannot create; auditor is read-only", async () => {
    await expect(createRefund(fatima, valid())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createRefund(maya, valid({ refundAmount: "999999" }))).rejects.toBeInstanceOf(ForbiddenError);
    const r = await makeRefund();
    await expect(transitionRefund(maya, r.id, "approve")).rejects.toBeInstanceOf(ForbiddenError);
    await expect(processRefund(maya, r.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addNote(maya, r.id, "hi")).rejects.toBeInstanceOf(ForbiddenError);
    expect(await auditCount(r.id)).toBe(0);
    expect((await getRefund(maya, r.id)).id).toBe(r.id);
  });

  it("roles without a refunds policy (analysts, senior reviewers) get no access", async () => {
    const r = await makeRefund();
    await expect(listRefunds(ana)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getRefund(sofia, r.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createRefund(sofia, valid())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("support agents see all refunds, not just their own", async () => {
    await makeRefund({ requestedById: priya.id });
    await makeRefund({ requestedById: marcus.id });
    await makeRefund({ requestedById: grace.id });
    expect(await listRefunds(priya)).toHaveLength(3);
    expect(await listRefunds(priya, { status: "approved" })).toHaveLength(0);
  });

  it("invalid transitions are refused and leave the status unchanged", async () => {
    const processed = await makeRefund({ status: "processed" });
    await expect(transitionRefund(fatima, processed.id, "approve")).rejects.toBeInstanceOf(TransitionError);
    await expect(transitionRefund(fatima, processed.id, "nope")).rejects.toBeInstanceOf(TransitionError);
    await expect(processRefund(fatima, processed.id)).rejects.toBeInstanceOf(TransitionError);
    const submitted = await makeRefund();
    const refund = spyPayments({ status: "succeeded", providerRefundId: "re_1" });
    await expect(processRefund(fatima, submitted.id)).rejects.toBeInstanceOf(TransitionError);
    expect(refund).not.toHaveBeenCalled();
    expect((await getRefund(fatima, submitted.id)).status).toBe("submitted");
  });
});

describe("processing", () => {
  it("calls PaymentsAdapter and records success", async () => {
    const r = await makeRefund({ status: "approved", approvedById: fatima.id, transactionId: "txn_ok", refundAmountCents: 80_000, reason: "fraud" });
    const refund = spyPayments({ status: "succeeded", providerRefundId: "re_123" });
    const done = await processRefund(tom, r.id);
    expect(refund).toHaveBeenCalledOnce();
    expect(refund).toHaveBeenCalledWith({ paymentId: "txn_ok", amountCents: 80_000, currency: "USD", reason: "Fraud" });
    expect(done.status).toBe("processed");
    expect(done.providerStatus).toBe("succeeded");
    expect(done.providerRefundId).toBe("re_123");
    expect(done.processedAt).toBeInstanceOf(Date);
    const rows = await audits(r.id);
    expect(rows.map((a) => a.action)).toEqual(["status_change:process_succeeded"]);
    expect(rows[0].actorId).toBe(tom.id);
    expect(JSON.parse(rows[0].after!).providerRefundId).toBe("re_123");
    expect(await db.notification.count({ where: { entityId: r.id } })).toBe(0);
  });

  it("records a provider failure and sends a Slack notification", async () => {
    const r = await makeRefund({ status: "approved", approvedById: fatima.id });
    spyPayments({ status: "failed", providerRefundId: "", message: "Card closed" });
    const done = await processRefund(grace, r.id);
    expect(done.status).toBe("failed");
    expect(done.providerStatus).toBe("failed");
    expect(done.providerMessage).toBe("Card closed");
    expect((await audits(r.id)).map((a) => a.action)).toEqual(["status_change:process_failed"]);
    const n = await db.notification.findMany({ where: { entityId: r.id } });
    expect(n.map((x) => x.message)).toEqual([expect.stringMatching(/FAILED: Card closed/)]);
  });

  it("treats a thrown provider error as a failure", async () => {
    const r = await makeRefund({ status: "approved" });
    spyPayments(new Error("Provider timeout"));
    const done = await processRefund(fatima, r.id);
    expect(done.status).toBe("failed");
    expect(done.providerMessage).toBe("Provider timeout");
  });

  it("the mock provider declines transaction IDs containing FAIL", async () => {
    const r = await makeRefund({ status: "approved", transactionId: "txn_FAIL_demo" });
    expect((await processRefund(fatima, r.id)).status).toBe("failed");
    const ok = await makeRefund({ status: "approved", transactionId: "txn_good" });
    expect((await processRefund(fatima, ok.id)).status).toBe("processed");
  });
});

describe("audit", () => {
  it("every mutation writes exactly one audit entry", async () => {
    const r = await createRefund(priya, valid({ refundAmount: "800" }));
    expect(await auditCount(r.id)).toBe(1);
    const [created] = await audits(r.id);
    expect(created).toMatchObject({ action: "create", actorId: priya.id, app: "refunds", entityType: "RefundRequest", before: null });

    await addNote(fatima, r.id, "Checking with the bank.");
    expect(await auditCount(r.id)).toBe(2);
    await transitionRefund(fatima, r.id, "approve");
    expect(await auditCount(r.id)).toBe(3);
    spyPayments({ status: "succeeded", providerRefundId: "re_9" });
    await processRefund(tom, r.id);
    expect(await auditCount(r.id)).toBe(4);

    const rejected = await createRefund(marcus, valid({ refundAmount: "700" }));
    await transitionRefund(tom, rejected.id, "reject");
    expect((await audits(rejected.id)).map((a) => a.action)).toEqual(["create", "status_change:reject"]);

    const history = await getRefundHistory(maya, r.id);
    expect(history.map((h) => h.action)).toEqual(expect.arrayContaining(["create", "add_note", "status_change:approve", "status_change:process_succeeded"]));
  });

  it("refused mutations write no audit entry", async () => {
    const r = await makeRefund({ requestedById: priya.id });
    await expect(transitionRefund(priya, r.id, "approve")).rejects.toThrow();
    await expect(addNote(priya, r.id, "   ")).rejects.toBeInstanceOf(ValidationError);
    expect(await auditCount(r.id)).toBe(0);
  });
});

describe("dashboard summary", () => {
  it("counts pending approval, processed in the last 7 days, and failed", async () => {
    const now = new Date();
    await makeRefund({ status: "submitted" });
    await makeRefund({ status: "submitted" });
    await makeRefund({ status: "processed", processedAt: new Date(now.getTime() - 2 * 86_400_000) });
    await makeRefund({ status: "processed", processedAt: new Date(now.getTime() - 10 * 86_400_000) });
    await makeRefund({ status: "failed" });
    expect(await refundSummary(maya, now)).toEqual({ pendingApproval: 2, processedThisWeek: 1, failed: 1 });
    expect(await listRefunds(maya, { status: "processed", processedSince: weekAgo(now) })).toHaveLength(1);
    expect(await listRefunds(maya, { status: "processed" })).toHaveLength(2);
  });
});
