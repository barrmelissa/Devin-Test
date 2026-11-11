import { beforeEach, describe, expect, it } from "vitest";
import { getCase, getCaseHistory, listCases, addNote } from "@/apps/kyc/service";
import { ForbiddenError } from "@/foundation/errors";
import { ana, grace, makeCase, maya, omar, resetDb, sofia } from "./helpers";

beforeEach(resetDb);

describe("row-level access (server-side)", () => {
  it("analyst cannot read a case not assigned to them", async () => {
    const omarsCase = await makeCase({ assignedAnalystId: omar.id });
    await expect(getCase(ana, omarsCase.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(getCaseHistory(ana, omarsCase.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addNote(ana, omarsCase.id, "sneaky")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("analyst list only contains their own cases", async () => {
    await makeCase({ assignedAnalystId: ana.id, customerName: "Mine" });
    await makeCase({ assignedAnalystId: omar.id, customerName: "Not mine" });
    await makeCase({ assignedAnalystId: null, customerName: "Unassigned" });
    const names = (await listCases(ana)).map((c) => c.customerName);
    expect(names).toEqual(["Mine"]);
  });

  it("senior reviewers, admins and auditors see all cases", async () => {
    await makeCase({ assignedAnalystId: ana.id });
    await makeCase({ assignedAnalystId: omar.id });
    for (const u of [sofia, grace, maya]) expect(await listCases(u)).toHaveLength(2);
  });

  it("auditor is read-only", async () => {
    const c = await makeCase();
    await expect(addNote(maya, c.id, "hello")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("field masking", () => {
  it("tax ID is masked for analysts and visible to senior reviewers", async () => {
    const c = await makeCase({ taxId: "84-2917365" });
    const asAnalyst = await getCase(ana, c.id);
    const asSenior = await getCase(sofia, c.id);
    expect(asAnalyst.taxId).not.toContain("84-29");
    expect(asAnalyst.taxId.endsWith("7365")).toBe(true);
    expect(asSenior.taxId).toBe("84-2917365");
    expect((await listCases(ana))[0].taxId).toBe(asAnalyst.taxId);
  });

  it("tax ID is masked inside audit history for analysts", async () => {
    const c = await makeCase({ taxId: "84-2917365" });
    await addNote(ana, c.id, "checked");
    const [entry] = await getCaseHistory(ana, c.id);
    expect(entry.before?.taxId).not.toBe("84-2917365");
    const [seniorEntry] = await getCaseHistory(sofia, c.id);
    expect(seniorEntry.before?.taxId).toBe("84-2917365");
  });
});
