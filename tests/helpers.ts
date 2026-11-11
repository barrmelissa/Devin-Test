// Tests may use the db client directly for fixtures; app code may not.
import type { Prisma } from "@prisma/client";
import { encryptField } from "@/foundation/crypto";
import { db } from "@/foundation/db";
import type { Principal } from "@/foundation/identity/types";

export const ana: Principal = { id: "t_ana", name: "Ana (analyst)", role: "analyst" };
export const omar: Principal = { id: "t_omar", name: "Omar (analyst)", role: "analyst" };
export const sofia: Principal = { id: "t_sofia", name: "Sofia (senior reviewer)", role: "senior_reviewer" };
export const raj: Principal = { id: "t_raj", name: "Raj (senior reviewer)", role: "senior_reviewer" };
export const grace: Principal = { id: "t_grace", name: "Grace (admin)", role: "admin" };
export const maya: Principal = { id: "t_maya", name: "Maya (auditor)", role: "auditor" };
export const priya: Principal = { id: "t_priya", name: "Priya (engineer)", role: "engineer" };
export const tom: Principal = { id: "t_tom", name: "Tom (engineer)", role: "engineer" };
export const elena: Principal = { id: "t_elena", name: "Elena (release manager)", role: "release_manager" };
export const marcus: Principal = { id: "t_marcus", name: "Marcus (release manager)", role: "release_manager" };

export async function resetDb() {
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.kycCase.deleteMany();
  await db.featureFlag.deleteMany();
  await db.user.deleteMany();
  for (const u of [ana, omar, sofia, raj, grace, maya, priya, tom, elena, marcus]) {
    await db.user.create({ data: { ...u, email: `${u.id}@example.com` } });
  }
}

// Writes like the foundation does (tax ID encrypted) and returns the record with the plaintext tax ID.
export async function makeCase(overrides: Partial<Prisma.KycCaseUncheckedCreateInput> = {}) {
  const taxId = overrides.taxId ?? "12-3456789";
  const row = await db.kycCase.create({
    data: {
      customerName: "Test Customer",
      country: "US",
      riskScore: 30,
      status: "in_review",
      assignedAnalystId: ana.id,
      ...overrides,
      taxId: encryptField(taxId),
    },
  });
  return { ...row, taxId };
}

export async function makeFlag(overrides: Partial<Prisma.FeatureFlagUncheckedCreateInput> = {}) {
  return db.featureFlag.create({
    data: { key: `flag_${Math.random().toString(36).slice(2, 8)}`, description: "Test flag", ownerTeam: "platform", lastChangedById: priya.id, ...overrides },
  });
}

export function auditCount(entityId: string) {
  return db.auditLog.count({ where: { entityId } });
}

export { db };
