import { PrismaClient } from "@prisma/client";
import { maskLast4 } from "../src/foundation/access/masking";
import { encryptField } from "../src/foundation/crypto";

const prisma = new PrismaClient();

const users = [
  { id: "u_ana", name: "Ana (analyst)", email: "ana@example.com", role: "analyst" },
  { id: "u_omar", name: "Omar (analyst)", email: "omar@example.com", role: "analyst" },
  { id: "u_sofia", name: "Sofia (senior reviewer)", email: "sofia@example.com", role: "senior_reviewer" },
  { id: "u_raj", name: "Raj (senior reviewer)", email: "raj@example.com", role: "senior_reviewer" },
  { id: "u_grace", name: "Grace (admin)", email: "grace@example.com", role: "admin" },
  { id: "u_hiro", name: "Hiro (admin)", email: "hiro@example.com", role: "admin" },
  { id: "u_maya", name: "Maya (auditor)", email: "maya@example.com", role: "auditor" },
  { id: "u_leo", name: "Leo (auditor)", email: "leo@example.com", role: "auditor" },
  { id: "u_priya", name: "Priya (support)", email: "priya@example.com", role: "support_agent" },
  { id: "u_marcus", name: "Marcus (support)", email: "marcus@example.com", role: "support_agent" },
  { id: "u_fatima", name: "Fatima (finance)", email: "fatima@example.com", role: "finance_approver" },
  { id: "u_tom", name: "Tom (finance)", email: "tom@example.com", role: "finance_approver" },
  { id: "u_nina", name: "Nina (engineer)", email: "nina@example.com", role: "engineer" },
  { id: "u_sam", name: "Sam (engineer)", email: "sam@example.com", role: "engineer" },
  { id: "u_elena", name: "Elena (release manager)", email: "elena@example.com", role: "release_manager" },
  { id: "u_diana", name: "Diana (release manager)", email: "diana@example.com", role: "release_manager" },
];

type Seed = {
  customerName: string;
  country: string;
  riskScore: number;
  taxId: string;
  status: string;
  assignedAnalystId?: string;
  submittedById?: string;
  recommendation?: string;
  vendorResult?: string;
  vendorReason?: string;
  notes?: string;
};

const cases: Seed[] = [
  // new
  { customerName: "Brightwater Logistics LLC", country: "US", riskScore: 22, taxId: "84-2917365", status: "new", assignedAnalystId: "u_ana" },
  { customerName: "Elena Petrova", country: "BG", riskScore: 47, taxId: "BG7502143381", status: "new", assignedAnalystId: "u_omar" },
  { customerName: "Kofi Mensah", country: "GH", riskScore: 35, taxId: "GHA-718204553", status: "new", assignedAnalystId: "u_ana" },
  { customerName: "Nordlicht Trading GmbH", country: "DE", riskScore: 58, taxId: "DE284019375", status: "new", assignedAnalystId: "u_omar" },
  { customerName: "Lucía Fernández", country: "MX", riskScore: 12, taxId: "FEFL900312MX4", status: "new" },
  { customerName: "Harbor & Pine Coffee Co.", country: "CA", riskScore: 9, taxId: "873920145RC0001", status: "new" },
  // in_review
  { customerName: "Daniel Okafor", country: "NG", riskScore: 66, taxId: "NG-23019487561", status: "in_review", assignedAnalystId: "u_ana", notes: "[Ana (analyst)] Requested proof of address." },
  { customerName: "Meridian Crypto OTC Ltd", country: "MT", riskScore: 81, taxId: "MT29384710", status: "in_review", assignedAnalystId: "u_ana", vendorResult: "review", vendorReason: "High risk score (81); manual review required" },
  { customerName: "Priya Raman", country: "IN", riskScore: 18, taxId: "AQRPR4821K", status: "in_review", assignedAnalystId: "u_omar", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified" },
  { customerName: "Tomasz Kowalczyk", country: "PL", riskScore: 41, taxId: "PL8371920465", status: "in_review", assignedAnalystId: "u_omar" },
  { customerName: "Sunrise Remittance Services", country: "AE", riskScore: 73, taxId: "AE100384729100003", status: "in_review", assignedAnalystId: "u_ana" },
  { customerName: "Isabella Rossi", country: "IT", riskScore: 27, taxId: "RSSSBL88A41H501Z", status: "in_review", assignedAnalystId: "u_omar" },
  // pending_approval
  { customerName: "Atlas Freight Partners", country: "US", riskScore: 33, taxId: "47-1830294", status: "pending_approval", assignedAnalystId: "u_ana", submittedById: "u_ana", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified", notes: "[Ana (analyst)] Docs complete. Recommend approve." },
  { customerName: "Viktor Andersson", country: "SE", riskScore: 29, taxId: "SE198105123391", status: "pending_approval", assignedAnalystId: "u_omar", submittedById: "u_omar", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified" },
  { customerName: "Golden Lotus Imports", country: "HK", riskScore: 77, taxId: "HK-60192837", status: "pending_approval", assignedAnalystId: "u_ana", submittedById: "u_ana", recommendation: "reject", vendorResult: "review", vendorReason: "High risk score (77); manual review required", notes: "[Ana (analyst)] Beneficial ownership unclear. Recommend reject." },
  { customerName: "Chen Wei", country: "SG", riskScore: 52, taxId: "S8234567D", status: "pending_approval", assignedAnalystId: "u_omar", submittedById: "u_sofia", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified", notes: "[Sofia (senior reviewer)] Took over while Omar was out. Recommend approve." },
  { customerName: "Oceanic Payments SA", country: "PA", riskScore: 69, taxId: "PA-155629384-2-2019", status: "pending_approval", assignedAnalystId: "u_ana", submittedById: "u_grace", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified", notes: "[Grace (admin)] Submitted on behalf of the team." },
  // approved
  { customerName: "Maple Leaf Dental Group", country: "CA", riskScore: 8, taxId: "812345678RC0001", status: "approved", assignedAnalystId: "u_omar", submittedById: "u_omar", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified" },
  { customerName: "Aisha Bello", country: "GB", riskScore: 15, taxId: "QQ123456C", status: "approved", assignedAnalystId: "u_ana", submittedById: "u_ana", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified" },
  { customerName: "Pacific Rim Software Inc.", country: "US", riskScore: 21, taxId: "95-4728193", status: "approved", assignedAnalystId: "u_omar", submittedById: "u_omar", recommendation: "approve", vendorResult: "pass", vendorReason: "No sanctions or PEP matches; ID verified" },
  // rejected
  { customerName: "Volga Energy Holdings", country: "RU", riskScore: 94, taxId: "RU7708123456", status: "rejected", assignedAnalystId: "u_ana", submittedById: "u_ana", recommendation: "reject", vendorResult: "fail", vendorReason: "Sanctions list match (country: RU)" },
  { customerName: "Marco Santini", country: "IT", riskScore: 62, taxId: "SNTMRC75C12F205X", status: "rejected", assignedAnalystId: "u_omar", submittedById: "u_omar", recommendation: "reject", vendorResult: "review", vendorReason: "Document mismatch: name on ID differs" },
  // escalated
  { customerName: "Caspian Shipping Co.", country: "AZ", riskScore: 88, taxId: "AZ1401234567", status: "escalated", assignedAnalystId: "u_ana", vendorResult: "review", vendorReason: "High risk score (88); manual review required", notes: "[Ana (analyst)] Possible PEP link. Escalating." },
  { customerName: "Rafael Duarte", country: "BR", riskScore: 71, taxId: "123.456.789-09", status: "escalated", assignedAnalystId: "u_omar", vendorResult: "review", vendorReason: "High risk score (71); manual review required" },
  { customerName: "Blue Horizon Ventures", country: "KY", riskScore: 84, taxId: "KY-CR-339201", status: "escalated", assignedAnalystId: "u_ana", notes: "[Ana (analyst)] Shell company indicators." },
];

// Feature-flag admin. `pending` seeds an open prod change request (requested by `by`).
type FlagSeed = {
  key: string;
  description: string;
  ownerTeam: string;
  dev: boolean;
  staging: boolean;
  prod: boolean;
  rollout: number;
  changedBy: string;
  status?: "approved" | "rejected";
  pending?: { enabled: boolean; rollout: number; reason: string; by: string };
};

const flags: FlagSeed[] = [
  { key: "new_checkout_flow", description: "Single-page checkout with saved payment methods", ownerTeam: "checkout", dev: true, staging: true, prod: true, rollout: 25, changedBy: "u_elena", status: "approved",
    pending: { enabled: true, rollout: 50, reason: "Conversion +2.1% at 25% with no error-rate change. Next step of the ramp; roll back by setting 25%.", by: "u_nina" } },
  { key: "apple_pay", description: "Offer Apple Pay at checkout on Safari and iOS", ownerTeam: "payments", dev: true, staging: true, prod: true, rollout: 100, changedBy: "u_diana", status: "approved" },
  { key: "instant_payouts", description: "Same-day payouts for verified merchants", ownerTeam: "payments", dev: true, staging: true, prod: false, rollout: 0, changedBy: "u_sam",
    pending: { enabled: true, rollout: 10, reason: "Staging soak finished (7 days, no reconciliation breaks). Start with 10% of verified merchants.", by: "u_sam" } },
  { key: "legacy_invoice_pdf", description: "Old invoice PDF renderer (kill switch for the new one)", ownerTeam: "platform", dev: false, staging: false, prod: true, rollout: 100, changedBy: "u_grace",
    pending: { enabled: false, rollout: 0, reason: "New renderer is at 100% for 30 days; retire the legacy path.", by: "u_grace" } },
  { key: "risk_score_v2", description: "New fraud model for card-not-present payments", ownerTeam: "risk", dev: true, staging: true, prod: true, rollout: 10, changedBy: "u_elena", status: "approved",
    pending: { enabled: true, rollout: 100, reason: "Model looks good, go to 100%.", by: "u_nina" } },
  { key: "search_typo_tolerance", description: "Fuzzy matching in merchant search", ownerTeam: "search", dev: true, staging: true, prod: true, rollout: 100, changedBy: "u_diana", status: "approved" },
  { key: "onboarding_doc_upload_v2", description: "Drag-and-drop KYC document upload with auto-crop", ownerTeam: "onboarding", dev: true, staging: true, prod: false, rollout: 0, changedBy: "u_elena", status: "rejected" },
  { key: "dark_mode", description: "Dark theme in the merchant dashboard", ownerTeam: "growth", dev: true, staging: false, prod: false, rollout: 0, changedBy: "u_nina" },
  { key: "mobile_biometric_login", description: "Face ID / fingerprint login in the mobile app", ownerTeam: "mobile", dev: true, staging: true, prod: true, rollout: 50, changedBy: "u_hiro", status: "approved" },
  { key: "referral_banner", description: "Referral program banner on the home page", ownerTeam: "growth", dev: true, staging: true, prod: false, rollout: 0, changedBy: "u_diana", status: "approved" },
  { key: "multi_currency_wallet", description: "Hold balances in EUR, GBP and USD", ownerTeam: "payments", dev: true, staging: false, prod: false, rollout: 0, changedBy: "u_sam" },
  { key: "rate_limit_strict_mode", description: "Stricter API rate limits for unauthenticated calls", ownerTeam: "platform", dev: true, staging: true, prod: true, rollout: 100, changedBy: "u_hiro", status: "approved" },
  { key: "sanctions_rescreen_nightly", description: "Nightly re-screening of all merchants against sanctions lists", ownerTeam: "risk", dev: true, staging: true, prod: false, rollout: 0, changedBy: "u_nina" },
  { key: "saved_carts", description: "Persist carts across devices for signed-in shoppers", ownerTeam: "checkout", dev: false, staging: false, prod: false, rollout: 0, changedBy: "u_sam" },
  { key: "search_semantic_ranking", description: "Embedding-based ranking for search results", ownerTeam: "search", dev: true, staging: true, prod: true, rollout: 5, changedBy: "u_diana", status: "rejected" },
];

async function seedFlags(now: number) {
  for (const [i, f] of flags.entries()) {
    const createdAt = new Date(now - (flags.length - i + 20) * 24 * 60 * 60 * 1000);
    const lastChangedAt = new Date(now - (flags.length - i + 2) * 24 * 60 * 60 * 1000);
    const created = await prisma.featureFlag.create({
      data: {
        key: f.key, description: f.description, ownerTeam: f.ownerTeam,
        devEnabled: f.dev, stagingEnabled: f.staging, prodEnabled: f.prod, prodRolloutPercent: f.rollout,
        prodChangeStatus: f.status ?? "none",
        flagServiceChangeId: f.status === "approved" ? `fsc_seed_${i + 1}` : null,
        lastChangedById: f.changedBy, lastChangedAt, createdAt,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: "system", actorName: "Seed script", actorRole: "system", app: "feature-flags", entityType: "FeatureFlag",
        entityId: created.id, action: "create", before: null, after: JSON.stringify(created), createdAt,
      },
    });
    if (f.pending) {
      const requester = users.find((u) => u.id === f.pending!.by)!;
      const requestedAt = new Date(now - (flags.length - i) * 60 * 60 * 1000);
      const requested = await prisma.featureFlag.update({
        where: { id: created.id },
        data: {
          prodChangeStatus: "pending", prodChangeRequestedById: requester.id, prodChangeRequestedAt: requestedAt,
          pendingProdEnabled: f.pending.enabled, pendingProdRolloutPercent: f.pending.rollout, prodChangeReason: f.pending.reason,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: requester.id, actorName: requester.name, actorRole: requester.role, app: "feature-flags", entityType: "FeatureFlag",
          entityId: created.id, action: "status_change:request", before: JSON.stringify(created), after: JSON.stringify(requested), createdAt: requestedAt,
        },
      });
    }
  }
}

// ---- Refunds ----
// [customer, transactionId, original $, refund $, reason, status, requestedBy, approvedBy ("auto" = auto-approved), created days ago, processed days ago]
type RefundSeed = [string, string, number, number, string, string, string, string | null, number, number?];
const refunds: RefundSeed[] = [
  // submitted (over $500, waiting for finance)
  ["Northwind Traders", "txn_3QK8f2LmA91x", 1840, 1840, "duplicate_charge", "submitted", "u_priya", null, 0.2],
  ["Helen Park", "txn_3QK7z0PqB55c", 1299, 750, "service_issue", "submitted", "u_marcus", null, 0.5],
  ["Contoso Fitness", "txn_3QJy71VtC08d", 4200, 2600, "fraud", "submitted", "u_grace", null, 1],
  ["Ravi Shah", "txn_3QJw94HsD33e", 980, 980, "fraud", "submitted", "u_hiro", null, 1.5],
  // approved (ready to process)
  ["Lena Fischer", "txn_3QJu22KdE71f", 89, 89, "duplicate_charge", "approved", "u_priya", "auto", 0.3],
  ["Bluebird Bakery", "txn_3QJs10WrF46g", 640, 320, "service_issue", "approved", "u_marcus", "auto", 0.7],
  ["Omega Analytics Ltd", "txn_3QJq55NbG19h", 2500, 1200, "other", "approved", "u_priya", "u_fatima", 2],
  ["Diego Alvarez", "txn_FAIL_3QJo83Yc", 450, 450, "duplicate_charge", "approved", "u_marcus", "auto", 0.1],
  // processed
  ["Fourth Coffee", "txn_3QJm61JaH02i", 59.99, 59.99, "duplicate_charge", "processed", "u_priya", "auto", 3, 2.9],
  ["Grace Liu", "txn_3QJk40TpJ88j", 1500, 900, "service_issue", "processed", "u_marcus", "u_tom", 4, 3],
  ["Tailspin Toys", "txn_3QJi27QwK63k", 210, 210, "fraud", "processed", "u_priya", "auto", 2, 1.8],
  ["Samuel Osei", "txn_3QJg09ZeL37m", 3200, 3200, "fraud", "processed", "u_hiro", "u_fatima", 5, 4],
  ["Wingtip Supplies", "txn_3QJe86XrM14n", 120, 45.5, "other", "processed", "u_marcus", "auto", 12, 11],
  ["Nadia Haddad", "txn_3QJc72CvN90p", 760, 760, "duplicate_charge", "processed", "u_priya", "u_tom", 15, 13],
  // failed
  ["Adventure Works", "txn_3QJa38BuP56q", 699, 699, "service_issue", "failed", "u_marcus", "u_fatima", 3, 2],
  ["Yuki Tanaka", "txn_3QHz15MnQ21r", 35, 35, "duplicate_charge", "failed", "u_priya", "auto", 6, 5.5],
  // rejected
  ["Litware Inc.", "txn_3QHx91LkR08s", 5000, 5000, "other", "rejected", "u_priya", null, 7],
  ["Carlos Mendes", "txn_3QHv64JhS73t", 820, 820, "fraud", "rejected", "u_marcus", null, 8],
  ["Proseware Studio", "txn_3QHt30GfT49u", 1100, 600, "service_issue", "rejected", "u_grace", null, 9],
  ["Emma Novak", "txn_3QHr07DdU15v", 2300, 1150, "service_issue", "submitted", "u_marcus", null, 0.05],
];

async function main() {
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.kycCase.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.user.deleteMany();

  for (const u of users) await prisma.user.create({ data: u });

  const now = Date.now();
  for (const [i, c] of cases.entries()) {
    const createdAt = new Date(now - (cases.length - i) * 6 * 60 * 60 * 1000);
    const created = await prisma.kycCase.create({
      data: { ...c, taxId: encryptField(c.taxId), notes: c.notes ?? "", createdAt, vendorCheckedAt: c.vendorResult ? createdAt : null },
    });
    await prisma.auditLog.create({
      data: {
        actorId: "system",
        actorName: "Seed script",
        actorRole: "system",
        app: "kyc",
        entityType: "KycCase",
        entityId: created.id,
        action: "create",
        before: null,
        after: JSON.stringify({ ...created, taxId: maskLast4(c.taxId) }),
        createdAt,
      },
    });
  }

  const day = 24 * 60 * 60 * 1000;
  for (const [customerName, transactionId, original, refund, reason, status, requestedById, approver, ago, processedAgo] of refunds) {
    const createdAt = new Date(now - ago * day);
    const processedAt = processedAgo != null ? new Date(now - processedAgo * day) : null;
    const failed = status === "failed";
    const created = await prisma.refundRequest.create({
      data: {
        customerName, transactionId, reason, status, requestedById, createdAt,
        originalAmountCents: Math.round(original * 100),
        refundAmountCents: Math.round(refund * 100),
        autoApproved: approver === "auto",
        approvedById: approver && approver !== "auto" ? approver : null,
        processedAt,
        providerStatus: processedAt ? (failed ? "failed" : "succeeded") : null,
        providerRefundId: processedAt && !failed ? `re_mock_${transactionId.slice(-8)}` : null,
        providerMessage: processedAt ? (failed ? "Card account closed (mock)" : "Refund issued") : null,
        notes: status === "rejected" ? "[Fatima (finance)] Outside refund policy; customer offered account credit instead." : "",
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: "system", actorName: "Seed script", actorRole: "system", app: "refunds",
        entityType: "RefundRequest", entityId: created.id, action: "create", before: null,
        after: JSON.stringify(created), createdAt,
      },
    });
  }

    await seedFlags(now);

  console.log(`Seeded ${users.length} users, ${cases.length} KYC cases, ${refunds.length} refunds and ${flags.length} feature flags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
