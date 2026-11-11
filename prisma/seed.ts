import { PrismaClient } from "@prisma/client";

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

async function main() {
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.kycCase.deleteMany();
  await prisma.user.deleteMany();

  for (const u of users) await prisma.user.create({ data: u });

  const now = Date.now();
  for (const [i, c] of cases.entries()) {
    const createdAt = new Date(now - (cases.length - i) * 6 * 60 * 60 * 1000);
    const created = await prisma.kycCase.create({
      data: { ...c, notes: c.notes ?? "", createdAt, vendorCheckedAt: c.vendorResult ? createdAt : null },
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
        after: JSON.stringify(created),
        createdAt,
      },
    });
  }

  console.log(`Seeded ${users.length} users and ${cases.length} KYC cases.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
