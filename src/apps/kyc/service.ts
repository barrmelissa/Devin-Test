import type { Principal } from "@/foundation/identity/types";
import { listUsers } from "@/foundation/identity";
import { getAdapters } from "@/foundation/integrations";
import { createFromInput, getRecord, getRecordHistory, listRecords, transitionRecord, updateRecord, type KycCase, type User } from "@/foundation/data";
import type { ParsedInput } from "@/foundation/forms";
import { ValidationError } from "@/foundation/errors";
import { APP_ID, KycCaseEntity } from "./entity";
import { INTAKE_FIELDS, newCaseFields } from "./fields";

// KYC business logic. Everything goes through foundation helpers, so access control,
// masking and audit logging are applied automatically.

export type KycCaseWithAnalyst = KycCase & { assignedAnalyst: Pick<User, "id" | "name"> | null };

export const RISK_BANDS = {
  low: { label: "Low (0-39)", min: 0, max: 39 },
  medium: { label: "Medium (40-69)", min: 40, max: 69 },
  high: { label: "High (70-100)", min: 70, max: 100 },
} as const;
export type RiskBand = keyof typeof RISK_BANDS;

export function riskBand(score: number): RiskBand {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}

export async function listCases(user: Principal, filters: { status?: string; risk?: string } = {}) {
  const band = filters.risk && filters.risk in RISK_BANDS ? RISK_BANDS[filters.risk as RiskBand] : undefined;
  return listRecords(user, KycCaseEntity, {
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(band ? { riskScore: { gte: band.min, lte: band.max } } : {}),
    },
    include: { assignedAnalyst: true },
    orderBy: [{ riskScore: "desc" }, { createdAt: "asc" }],
  }) as Promise<KycCaseWithAnalyst[]>;
}

export async function getCase(user: Principal, id: string) {
  return getRecord(user, KycCaseEntity, id, { include: { assignedAnalyst: true, submittedBy: true } }) as Promise<
    KycCaseWithAnalyst & { submittedBy: Pick<User, "id" | "name"> | null }
  >;
}

export function getCaseHistory(user: Principal, id: string) {
  return getRecordHistory(user, KycCaseEntity, id);
}

const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
const noteLine = (user: Principal, text: string) => `[${user.name}, ${stamp()}] ${text}`;

function caseFromInput(v: ParsedInput) {
  return { customerName: String(v.customerName), country: String(v.country), taxId: String(v.taxId), riskScore: Number(v.riskScore) };
}

export async function getNewCaseFields() {
  return newCaseFields(await listUsers({ role: "analyst" }));
}

/** Manual "New case" form (admin, senior reviewer). */
export async function createCase(user: Principal, input: Record<string, unknown>) {
  return createFromInput(user, KycCaseEntity, await getNewCaseFields(), input, {
    build: (v) => ({
      ...caseFromInput(v),
      assignedAnalystId: v.assignedAnalystId ? String(v.assignedAnalystId) : null,
      notes: v.notes ? noteLine(user, String(v.notes)) : "",
    }),
  });
}

/** Automated intake from the onboarding system: creates a "new" case with the vendor check already run. */
export async function intakeSignup(user: Principal, input: Record<string, unknown>) {
  return createFromInput(user, KycCaseEntity, INTAKE_FIELDS, input, {
    action: "intake",
    build: async (v) => {
      const c = caseFromInput(v);
      const check = await getAdapters().kycVendor.runCheck(c);
      return {
        ...c,
        vendorResult: check.result,
        vendorReason: check.reason,
        vendorCheckedAt: check.checkedAt,
        notes: noteLine(user, "Received from onboarding; vendor check ran automatically."),
      };
    },
  });
}

export async function runVendorCheck(user: Principal, id: string) {
  // The vendor needs the real tax ID, so it is called from the patch callback, which receives
  // the unmasked record only after the foundation has checked the caller may update this case.
  return updateRecord(user, KycCaseEntity, id, {}, {
    action: "vendor_check",
    requireStatus: ["in_review"],
    patch: async (current) => {
      const check = await getAdapters().kycVendor.runCheck({
        customerName: current.customerName,
        country: current.country,
        riskScore: current.riskScore,
        taxId: current.taxId,
      });
      return { vendorResult: check.result, vendorReason: check.reason, vendorCheckedAt: check.checkedAt };
    },
  });
}

export async function addNote(user: Principal, id: string, text: string) {
  const note = text.trim();
  if (!note) throw new ValidationError("Note cannot be empty.");
  return updateRecord(user, KycCaseEntity, id, {}, {
    action: "add_note",
    requireStatus: ["new", "in_review", "pending_approval", "escalated"],
    patch: (current) => ({ notes: `${current.notes ? `${current.notes}\n` : ""}${noteLine(user, note)}` }),
  });
}

export async function transitionCase(user: Principal, id: string, transition: string, input: { recommendation?: string } = {}) {
  const data: Partial<KycCase> = {};
  if (transition === "submit") {
    const current = await getRecord(user, KycCaseEntity, id);
    if (!current.vendorResult) throw new ValidationError("Run the vendor check before submitting.");
    if (input.recommendation !== "approve" && input.recommendation !== "reject") {
      throw new ValidationError("Choose a recommendation (approve or reject).");
    }
    data.recommendation = input.recommendation;
  }
  const updated = await transitionRecord(user, KycCaseEntity, id, transition, data);
  if (transition === "approve" || transition === "reject") {
    await getAdapters().notifications.send({
      app: APP_ID,
      entityId: id,
      message: `KYC case for ${updated.customerName} was ${updated.status} by ${user.name}.`,
    });
  }
  return updated;
}
