import { beforeEach, describe, expect, it } from "vitest";
import { KycCaseEntity } from "@/apps/kyc/entity";
import { addNote, getCase, runVendorCheck, transitionCase } from "@/apps/kyc/service";
import { decryptField, encryptField } from "@/foundation/crypto";
import { createRecord } from "@/foundation/data";
import { ana, db, grace, makeCase, resetDb, sofia } from "./helpers";

beforeEach(resetDb);

const TAX_ID = "84-2917365";

async function storedTaxId(id: string) {
  return (await db.kycCase.findUniqueOrThrow({ where: { id } })).taxId;
}

async function rawAuditText(entityId: string) {
  const rows = await db.auditLog.findMany({ where: { entityId } });
  return rows.map((r) => `${r.before ?? ""}${r.after ?? ""}`).join("\n");
}

describe("field encryption", () => {
  it("round-trips and uses a fresh IV for each value", () => {
    const a = encryptField(TAX_ID);
    expect(a).not.toContain(TAX_ID);
    expect(a).not.toBe(encryptField(TAX_ID));
    expect(decryptField(a)).toBe(TAX_ID);
  });

  it("rejects tampered ciphertext and unencrypted values", () => {
    const enc = encryptField(TAX_ID);
    const parts = enc.split(":");
    const ct = Buffer.from(parts[4], "base64");
    ct[0] ^= 1;
    const tampered = [...parts.slice(0, 4), ct.toString("base64")].join(":");
    expect(() => decryptField(tampered)).toThrow();
    expect(() => decryptField(TAX_ID)).toThrow(/unencrypted/);
  });

  it("createRecord stores the tax ID encrypted and returns it decrypted to permitted roles", async () => {
    const created = (await createRecord(grace, KycCaseEntity, { customerName: "New Co", country: "US", riskScore: 10, taxId: TAX_ID })) as { id: string; taxId: string };
    expect(created.taxId).toBe(TAX_ID);
    const stored = await storedTaxId(created.id);
    expect(stored.startsWith("enc:v1:")).toBe(true);
    expect(stored).not.toContain(TAX_ID);
    expect((await getCase(sofia, created.id)).taxId).toBe(TAX_ID);
  });

  it("the plaintext tax ID never appears in the database after updates and transitions", async () => {
    const c = await makeCase({ taxId: TAX_ID });
    await runVendorCheck(ana, c.id);
    await addNote(ana, c.id, "Docs look fine");
    await transitionCase(ana, c.id, "submit", { recommendation: "approve" });
    await transitionCase(sofia, c.id, "approve");

    expect(await storedTaxId(c.id)).not.toContain(TAX_ID);
    const audit = await rawAuditText(c.id);
    expect(audit).not.toContain(TAX_ID);
    expect(audit).not.toContain("enc:v1:");
    expect(audit).toContain("7365");
  });
});
