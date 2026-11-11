import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveProdChange, createFlag, getFlag, getFlagHistory, listFlags, listPendingProdChanges,
  rejectProdChange, requestProdChange, setEnvironment,
} from "@/apps/feature-flags/service";
import { ForbiddenError, MakerCheckerError, TransitionError, ValidationError } from "@/foundation/errors";
import { getAdapters, setAdapters } from "@/foundation/integrations";
import { ana, db, elena, grace, makeFlag, marcus, maya, priya, resetDb, sofia, tom } from "./helpers";

// Not applicable from the playbook's list: row scope (every role with access sees every flag)
// and masking/encryption (FeatureFlag has no sensitive fields).

const applyChange = vi.fn(async () => ({ changeId: "fsc_test_1", appliedAt: new Date("2026-11-11T12:00:00Z") }));

beforeEach(async () => {
  await resetDb();
  applyChange.mockClear();
  setAdapters({ ...getAdapters(), flagService: { applyChange } });
});
afterEach(() => setAdapters(undefined));

async function audit(entityId: string) {
  const rows = await db.auditLog.findMany({ where: { entityId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ ...r, before: r.before ? JSON.parse(r.before) : null, after: r.after ? JSON.parse(r.after) : null }));
}

const prodRequest = { enabled: "on", rolloutPercent: 25, reason: "Ramp to 25%" };

describe("dev and staging", () => {
  it("engineer toggles staging directly: one audit entry with before/after", async () => {
    const f = await makeFlag();
    const updated = await setEnvironment(priya, f.id, "staging", true);
    expect(updated).toMatchObject({ stagingEnabled: true, prodEnabled: false, lastChangedById: priya.id });
    const rows = await audit(f.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "toggle_staging", actorId: priya.id, actorRole: "engineer", app: "feature-flags" });
    expect(rows[0].before).toMatchObject({ stagingEnabled: false });
    expect(rows[0].after).toMatchObject({ stagingEnabled: true });
  });

  it("dev toggles apply immediately too; no-op toggles are rejected and not audited", async () => {
    const f = await makeFlag({ devEnabled: true });
    await expect(setEnvironment(tom, f.id, "dev", true)).rejects.toBeInstanceOf(ValidationError);
    await setEnvironment(tom, f.id, "dev", false);
    const rows = await audit(f.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "toggle_dev", before: { devEnabled: true }, after: { devEnabled: false } });
  });

  it("release managers, auditors and KYC roles cannot toggle", async () => {
    const f = await makeFlag();
    for (const u of [elena, maya, ana, sofia]) {
      await expect(setEnvironment(u, f.id, "dev", true)).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect((await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).devEnabled).toBe(false);
    expect(await audit(f.id)).toHaveLength(0);
  });
});

describe("prod changes", () => {
  it("nobody can change prod directly (server-side), admins included", async () => {
    const f = await makeFlag();
    for (const u of [priya, grace]) {
      await expect(setEnvironment(u, f.id, "prod", true)).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({ prodEnabled: false, prodRolloutPercent: 0 });
    expect(await audit(f.id)).toHaveLength(0);
  });

  it("a request does not change prod; it applies only after approval by a different user", async () => {
    const f = await makeFlag();
    const req = await requestProdChange(priya, f.id, prodRequest);
    expect(req).toMatchObject({ prodChangeStatus: "pending", prodChangeRequestedById: priya.id, pendingProdEnabled: true, pendingProdRolloutPercent: 25, prodEnabled: false, prodRolloutPercent: 0 });
    expect(applyChange).not.toHaveBeenCalled();

    await expect(approveProdChange(priya, f.id)).rejects.toBeInstanceOf(ForbiddenError); // engineers can't approve at all
    expect((await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).prodEnabled).toBe(false);

    const approved = await approveProdChange(elena, f.id);
    expect(approved).toMatchObject({ prodChangeStatus: "approved", prodEnabled: true, prodRolloutPercent: 25, pendingProdEnabled: null, lastChangedById: elena.id, flagServiceChangeId: "fsc_test_1" });
  });

  it("maker-checker: the requester cannot approve or reject their own request (admins included)", async () => {
    const f = await makeFlag();
    await requestProdChange(grace, f.id, prodRequest);
    await expect(approveProdChange(grace, f.id)).rejects.toBeInstanceOf(MakerCheckerError);
    await expect(rejectProdChange(grace, f.id)).rejects.toBeInstanceOf(MakerCheckerError);
    expect(applyChange).not.toHaveBeenCalled();
    expect(await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({ prodEnabled: false, prodChangeStatus: "pending" });
    await approveProdChange(marcus, f.id);
    expect((await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).prodEnabled).toBe(true);
  });

  it("FlagServiceAdapter is called on approval with the requested values, and Slack is notified", async () => {
    const f = await makeFlag({ key: "instant_payouts" });
    await requestProdChange(tom, f.id, { enabled: "on", rolloutPercent: 10, reason: "Start small" });
    await approveProdChange(marcus, f.id);
    expect(applyChange).toHaveBeenCalledTimes(1);
    expect(applyChange).toHaveBeenCalledWith({
      key: "instant_payouts", environment: "prod", enabled: true, rolloutPercent: 10, requestedBy: tom.name, approvedBy: marcus.name,
    });
    const notes = await db.notification.findMany({ where: { entityId: f.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ app: "feature-flags", channel: "#releases" });
    expect(notes[0].message).toContain("instant_payouts");
  });

  it("if the flag service push fails, nothing is applied and the request stays pending", async () => {
    const f = await makeFlag();
    await requestProdChange(priya, f.id, prodRequest);
    applyChange.mockRejectedValueOnce(new Error("flag service down"));
    await expect(approveProdChange(elena, f.id)).rejects.toThrow("flag service down");
    expect(await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).toMatchObject({ prodEnabled: false, prodChangeStatus: "pending" });
    expect((await audit(f.id)).map((r) => r.action)).toEqual(["status_change:request"]);
  });

  it("reject leaves prod untouched, does not call the flag service, and allows a new request", async () => {
    const f = await makeFlag();
    await requestProdChange(priya, f.id, prodRequest);
    const rejected = await rejectProdChange(elena, f.id);
    expect(rejected).toMatchObject({ prodChangeStatus: "rejected", prodEnabled: false, pendingProdEnabled: null });
    expect(applyChange).not.toHaveBeenCalled();
    await requestProdChange(tom, f.id, prodRequest);
    expect((await getFlag(tom, f.id)).prodChangeStatus).toBe("pending");
  });

  it.each([[101], [-1], ["12.5"], ["abc"]])("rollout %s is rejected", async (rolloutPercent) => {
    const f = await makeFlag();
    await expect(requestProdChange(priya, f.id, { ...prodRequest, rolloutPercent })).rejects.toBeInstanceOf(ValidationError);
    expect((await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).prodChangeStatus).toBe("none");
    expect(await audit(f.id)).toHaveLength(0);
  });

  it("rollout 0 and 100 are accepted; missing reason and no-op requests are rejected", async () => {
    const a = await makeFlag();
    await requestProdChange(priya, a.id, { ...prodRequest, rolloutPercent: 100 });
    const b = await makeFlag({ prodEnabled: true, prodRolloutPercent: 50 });
    await requestProdChange(priya, b.id, { enabled: "on", rolloutPercent: 0, reason: "Pause" });
    const c = await makeFlag();
    await expect(requestProdChange(priya, c.id, { ...prodRequest, reason: "" })).rejects.toThrow(/Reason is required/);
    await expect(requestProdChange(priya, c.id, { enabled: "off", rolloutPercent: 0, reason: "x" })).rejects.toThrow(/nothing to change/);
  });

  it("only engineers and admins can request; a second request while one is pending is refused", async () => {
    const f = await makeFlag();
    for (const u of [elena, maya, ana]) {
      await expect(requestProdChange(u, f.id, prodRequest)).rejects.toBeInstanceOf(ForbiddenError);
    }
    await requestProdChange(priya, f.id, prodRequest);
    await expect(requestProdChange(tom, f.id, { ...prodRequest, rolloutPercent: 50 })).rejects.toBeInstanceOf(TransitionError);
    expect((await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).pendingProdRolloutPercent).toBe(25);
  });

  it("invalid transitions: approve/reject with nothing pending, unknown decisions", async () => {
    const f = await makeFlag();
    await expect(approveProdChange(elena, f.id)).rejects.toBeInstanceOf(TransitionError);
    await expect(rejectProdChange(elena, f.id)).rejects.toBeInstanceOf(TransitionError);
    await requestProdChange(priya, f.id, prodRequest);
    await approveProdChange(elena, f.id);
    await expect(approveProdChange(marcus, f.id)).rejects.toBeInstanceOf(TransitionError);
    expect(applyChange).toHaveBeenCalledTimes(1);
  });

  it("auditors cannot approve or reject", async () => {
    const f = await makeFlag();
    await requestProdChange(priya, f.id, prodRequest);
    await expect(approveProdChange(maya, f.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(rejectProdChange(maya, f.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect((await db.featureFlag.findUniqueOrThrow({ where: { id: f.id } })).prodChangeStatus).toBe("pending");
  });
});

describe("audit trail", () => {
  it("every change writes exactly one audit entry with correct before/after values", async () => {
    const f = await createFlag(priya, { key: "audited_flag", description: "d", ownerTeam: "risk" });
    await setEnvironment(priya, f.id, "dev", true);
    await requestProdChange(tom, f.id, { enabled: "on", rolloutPercent: 30, reason: "go" });
    await approveProdChange(elena, f.id);
    await requestProdChange(priya, f.id, { enabled: "off", rolloutPercent: 30, reason: "roll back" });
    await rejectProdChange(marcus, f.id);

    const rows = await audit(f.id);
    expect(rows.map((r) => [r.action, r.actorId])).toEqual([
      ["create", priya.id],
      ["toggle_dev", priya.id],
      ["status_change:request", tom.id],
      ["status_change:approve", elena.id],
      ["status_change:request", priya.id],
      ["status_change:reject", marcus.id],
    ]);
    const [create, dev, request, approve, request2, reject] = rows;
    expect(create.before).toBeNull();
    expect(create.after).toMatchObject({ key: "audited_flag", devEnabled: false, prodEnabled: false, prodChangeStatus: "none" });
    expect(dev.before).toMatchObject({ devEnabled: false });
    expect(dev.after).toMatchObject({ devEnabled: true });
    expect(request.before).toMatchObject({ prodChangeStatus: "none", pendingProdEnabled: null, prodEnabled: false });
    expect(request.after).toMatchObject({ prodChangeStatus: "pending", pendingProdEnabled: true, pendingProdRolloutPercent: 30, prodChangeRequestedById: tom.id, prodEnabled: false });
    expect(approve.before).toMatchObject({ prodEnabled: false, prodRolloutPercent: 0, prodChangeStatus: "pending" });
    expect(approve.after).toMatchObject({ prodEnabled: true, prodRolloutPercent: 30, prodChangeStatus: "approved", flagServiceChangeId: "fsc_test_1" });
    expect(request2.after).toMatchObject({ pendingProdEnabled: false, prodEnabled: true });
    expect(reject.before).toMatchObject({ prodChangeStatus: "pending" });
    expect(reject.after).toMatchObject({ prodChangeStatus: "rejected", prodEnabled: true, prodRolloutPercent: 30 });

    // The flag detail screen's history is the same audit trail, newest first, readable by every role with access.
    for (const u of [priya, elena, maya]) expect((await getFlagHistory(u, f.id)).map((e) => e.action)[0]).toBe("status_change:reject");
  });
});

describe("create", () => {
  const input = { key: "new_checkout_flow", description: "Single-page checkout", ownerTeam: "checkout" };

  it("release managers, auditors and KYC roles cannot create (even with invalid input); nothing is written", async () => {
    for (const u of [elena, maya, ana, sofia]) {
      await expect(createFlag(u, input)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(createFlag(u, {})).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(await db.featureFlag.count()).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("engineer create starts off everywhere and writes one audit entry with before=null", async () => {
    const f = await createFlag(priya, input);
    expect(f).toMatchObject({ ...input, devEnabled: false, stagingEnabled: false, prodEnabled: false, prodRolloutPercent: 0, prodChangeStatus: "none", lastChangedById: priya.id });
    const rows = await audit(f.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: "create", actorId: priya.id, before: null });
  });

  it("admins can create", async () => {
    const f = await createFlag(grace, input);
    expect(f.lastChangedById).toBe(grace.id);
  });

  it.each([
    ["New_Checkout"], ["new-checkout"], ["new checkout"], ["1st_flag"], ["_leading"], ["trailing_"], ["double__underscore"], ["a".repeat(65)],
  ])("rejects badly formatted key %s", async (key) => {
    await expect(createFlag(priya, { ...input, key })).rejects.toBeInstanceOf(ValidationError);
    expect(await db.featureFlag.count()).toBe(0);
    expect(await db.auditLog.count()).toBe(0);
  });

  it("rejects duplicate keys", async () => {
    await createFlag(priya, input);
    await expect(createFlag(tom, { ...input, description: "again" })).rejects.toThrow(/already exists/);
    await expect(createFlag(tom, input)).rejects.toBeInstanceOf(ValidationError);
    expect(await db.featureFlag.count()).toBe(1);
    expect(await db.auditLog.count()).toBe(1);
  });

  it.each([
    [{ ...input, description: "" }, /Description is required/],
    [{ ...input, ownerTeam: "marketing" }, /Owner team has an invalid value/],
    [{ ...input, key: undefined }, /Key is required/],
  ])("rejects invalid input %#", async (bad, msg) => {
    await expect(createFlag(priya, bad)).rejects.toThrow(msg);
    expect(await db.featureFlag.count()).toBe(0);
  });

  it("ignores prod state, status and requester in the input", async () => {
    const f = await createFlag(priya, { ...input, prodEnabled: true, prodRolloutPercent: 100, prodChangeStatus: "approved", prodChangeRequestedById: priya.id });
    expect(f).toMatchObject({ prodEnabled: false, prodRolloutPercent: 0, prodChangeStatus: "none", prodChangeRequestedById: null });
  });
});

describe("read access", () => {
  it("every Feature-flag role lists all flags; KYC-only roles get nothing", async () => {
    await makeFlag();
    const p = await makeFlag({ prodChangeStatus: "pending", prodChangeRequestedById: priya.id, pendingProdEnabled: true, pendingProdRolloutPercent: 5 });
    for (const u of [priya, elena, grace, maya]) {
      expect(await listFlags(u)).toHaveLength(2);
      expect((await listPendingProdChanges(u)).map((f) => f.id)).toEqual([p.id]);
    }
    for (const u of [ana, sofia]) {
      await expect(listFlags(u)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(getFlag(u, p.id)).rejects.toBeInstanceOf(ForbiddenError);
    }
  });
});
