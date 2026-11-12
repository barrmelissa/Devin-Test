import { beforeEach, describe, expect, it, vi } from "vitest";
import { apps } from "@/apps";
import { ALL_ROLES, type Role } from "@/foundation/access";
import { collectAttention } from "@/foundation/attention";
import type { Principal } from "@/foundation/identity/types";
import { launcherCards, type AppManifest, type AttentionItem } from "@/foundation/registry";
import { ana, db, diana, elena, fatima, grace, makeCase, makeFlag, makeRefund, marcus, maya, nina, omar, priya, raj, resetDb, sam, sofia, tom } from "./helpers";

const PEOPLE_ROLES = ALL_ROLES.filter((r) => r !== "integration");
const as = (role: Role): Principal => ({ id: `x_${role}`, name: role, role });

describe("launcher", () => {
  it("lists every registered app and enables only the ones the role can access", () => {
    for (const role of PEOPLE_ROLES) {
      const user = as(role);
      const cards = launcherCards(user, apps);
      expect(cards.map((c) => c.id)).toEqual(apps.map((a) => a.id));
      for (const [i, card] of cards.entries()) expect(card.enabled, `${role} / ${card.id}`).toBe(apps[i].canAccess(user));
    }
  });

  it("greys out apps an analyst can't use", () => {
    const enabled = Object.fromEntries(launcherCards(ana, apps).map((c) => [c.id, c.enabled]));
    expect(enabled).toEqual({ kyc: true, refunds: false, "feature-flags": false });
  });

  it("each app's declared help roles match who can actually open it", () => {
    for (const app of apps) {
      expect(app.help.steps.length, app.id).toBeGreaterThanOrEqual(3);
      expect(app.help.steps.length, app.id).toBeLessThanOrEqual(5);
      expect(PEOPLE_ROLES.filter((r) => app.canAccess(as(r))), app.id).toEqual(PEOPLE_ROLES.filter((r) => app.help.roles.includes(r)));
    }
  });
});

describe("needs your attention: aggregation", () => {
  const item = (id: string, priority: AttentionItem["priority"], daysAgo: number): AttentionItem =>
    ({ id, title: id, priority, since: new Date(Date.now() - daysAgo * 86_400_000), href: `/x/${id}` });
  const fakeApp = (id: string, items: AttentionItem[], access = true) =>
    ({ id, name: id.toUpperCase(), description: "", canAccess: () => access, render: () => null, attention: vi.fn(async () => items),
      help: { roles: [], steps: [], demo: [], hints: {} } }) satisfies AppManifest;

  it("sorts by priority then oldest first, shows the top 8 and counts per app", async () => {
    const a = fakeApp("a", [item("a-low", "low", 9), item("a-high-new", "high", 1), ...Array.from({ length: 5 }, (_, i) => item(`a-med-${i}`, "medium", i))]);
    const b = fakeApp("b", [item("b-high-old", "high", 3), item("b-med-old", "medium", 30)]);
    const res = await collectAttention(grace, [a, b]);
    expect(res.total).toBe(9);
    expect(res.items.map((i) => i.id)).toEqual(["b-high-old", "a-high-new", "b-med-old", "a-med-4", "a-med-3", "a-med-2", "a-med-1", "a-med-0"]);
    expect(res.counts).toEqual([{ appId: "a", appName: "A", count: 7 }, { appId: "b", appName: "B", count: 2 }]);
  });

  it("never asks an app the user can't access", async () => {
    const hidden = fakeApp("hidden", [item("x", "high", 1)], false);
    const res = await collectAttention(ana, [hidden]);
    expect(hidden.attention).not.toHaveBeenCalled();
    expect(res).toEqual({ items: [], total: 0, counts: [] });
  });
});

describe("needs your attention: app rules", () => {
  let ids: Record<string, string>;

  beforeEach(async () => {
    await resetDb();
    const day = (n: number) => new Date(Date.now() - n * 86_400_000);
    const k = {
      kPendingBySofiaHigh: await makeCase({ status: "pending_approval", submittedById: sofia.id, assignedAnalystId: omar.id, riskScore: 80 }),
      kPendingByAna: await makeCase({ status: "pending_approval", submittedById: ana.id, riskScore: 30 }),
      kPendingByGrace: await makeCase({ status: "pending_approval", submittedById: grace.id, riskScore: 50 }),
      kReviewAnaHigh: await makeCase({ status: "in_review", assignedAnalystId: ana.id, riskScore: 75 }),
      kReviewOmar: await makeCase({ status: "in_review", assignedAnalystId: omar.id, riskScore: 20 }),
      kApproved: await makeCase({ status: "approved", submittedById: ana.id }),
    };
    const r = {
      rOverByPriya: await makeRefund({ requestedById: priya.id, refundAmountCents: 80_000, createdAt: day(2) }),
      rOverByFatima: await makeRefund({ requestedById: fatima.id, refundAmountCents: 80_000 }),
      rOverByGrace: await makeRefund({ requestedById: grace.id, refundAmountCents: 90_000, originalAmountCents: 100_000 }),
      rUnderThreshold: await makeRefund({ requestedById: priya.id, refundAmountCents: 30_000 }),
      rFailed: await makeRefund({ requestedById: marcus.id, refundAmountCents: 20_000, status: "failed", providerStatus: "failed", processedAt: day(1) }),
      rApproved: await makeRefund({ requestedById: marcus.id, status: "approved", approvedById: tom.id }),
    };
    const pending = (by: string) => ({ prodChangeStatus: "pending", prodChangeRequestedById: by, prodChangeRequestedAt: day(1), pendingProdEnabled: true, pendingProdRolloutPercent: 50, prodChangeReason: "ramp" });
    const f = {
      fPendingByNina: await makeFlag(pending(nina.id)),
      fPendingByGrace: await makeFlag(pending(grace.id)),
      fNoRequest: await makeFlag(),
    };
    ids = Object.fromEntries(Object.entries({ ...k, ...r, ...f }).map(([name, rec]) => [name, rec.id]));
  });

  const seen = async (user: Principal) => {
    const res = await collectAttention(user, apps, { limit: 100 });
    const names = Object.fromEntries(Object.entries(ids).map(([n, id]) => [id, n]));
    return res.items.map((i) => names[i.id]).sort();
  };

  it("shows each user exactly the items they can act on", async () => {
    const expected: [Principal, string[]][] = [
      [ana, ["kReviewAnaHigh"]],
      [omar, ["kReviewOmar"]],
      [sofia, ["kPendingByAna", "kPendingByGrace"]],
      [raj, ["kPendingByAna", "kPendingByGrace", "kPendingBySofiaHigh"]],
      [grace, ["fPendingByNina", "kPendingByAna", "kPendingBySofiaHigh", "rFailed", "rOverByFatima", "rOverByPriya"]],
      [maya, []],
      [priya, []],
      [marcus, []],
      [fatima, ["rFailed", "rOverByGrace", "rOverByPriya"]],
      [tom, ["rFailed", "rOverByFatima", "rOverByGrace", "rOverByPriya"]],
      [nina, []],
      [sam, []],
      [elena, ["fPendingByGrace", "fPendingByNina"]],
      [diana, ["fPendingByGrace", "fPendingByNina"]],
    ];
    for (const [user, names] of expected) expect(await seen(user), user.name).toEqual(names.sort());
  });

  it("never shows a user their own submission awaiting approval", async () => {
    for (const user of [ana, omar, sofia, raj, grace, maya, priya, marcus, fatima, tom, nina, sam, elena, diana]) {
      const { items } = await collectAttention(user, apps, { limit: 100 });
      for (const i of items) {
        const [kase, refund, flag] = await Promise.all([
          db.kycCase.findUnique({ where: { id: i.id } }),
          db.refundRequest.findUnique({ where: { id: i.id } }),
          db.featureFlag.findUnique({ where: { id: i.id } }),
        ]);
        const maker = kase?.submittedById ?? refund?.requestedById ?? flag?.prodChangeRequestedById;
        if (kase?.status === "pending_approval" || refund?.status === "submitted" || flag?.prodChangeStatus === "pending") {
          expect(maker, `${user.name} sees own ${i.title}`).not.toBe(user.id);
        }
        expect(apps.find((a) => a.id === i.appId)!.canAccess(user)).toBe(true);
      }
    }
  });

  it("sets priorities by rule", async () => {
    const byId = async (user: Principal) => Object.fromEntries((await collectAttention(user, apps, { limit: 100 })).items.map((i) => [i.id, i.priority]));
    const rajItems = await byId(raj);
    expect(rajItems[ids.kPendingBySofiaHigh]).toBe("high");
    expect(rajItems[ids.kPendingByAna]).toBe("medium");
    expect((await byId(ana))[ids.kReviewAnaHigh]).toBe("medium");
    expect((await byId(omar))[ids.kReviewOmar]).toBe("low");
    const tomItems = await byId(tom);
    expect(tomItems[ids.rFailed]).toBe("high");
    expect(tomItems[ids.rOverByPriya]).toBe("medium");
    expect((await byId(elena))[ids.fPendingByNina]).toBe("medium");
  });

  it("drops an item once it has been acted on", async () => {
    const { transitionCase } = await import("@/apps/kyc/service");
    await db.kycCase.update({ where: { id: ids.kPendingByAna }, data: { vendorResult: "pass", recommendation: "approve" } });
    await transitionCase(raj, ids.kPendingByAna, "approve");
    expect(await seen(raj)).not.toContain("kPendingByAna");
  });
});
