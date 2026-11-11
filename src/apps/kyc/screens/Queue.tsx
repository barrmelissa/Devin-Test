import { can, canSeeField } from "@/foundation/access";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, DataTable, FilterBar, PageHeader, StatusBadge, humanize } from "@/foundation/ui";
import { APP_ID, KYC_STATUSES, KycCaseEntity, kycPolicy } from "../entity";
import { RISK_BANDS, listCases, riskBand, type KycCaseWithAnalyst } from "../service";
import { RiskScore } from "./RiskScore";

export async function Queue({ user, searchParams }: Omit<AppScreenProps, "path">) {
  const cases = await listCases(user, { status: searchParams.status, risk: searchParams.risk });
  const scoped = user.role === "analyst";
  return (
    <>
      <PageHeader
        title="KYC review queue"
        subtitle={scoped ? "Showing cases assigned to you." : `Showing all cases${can(user, "transition", { entity: KycCaseEntity }) ? "" : " (read-only)"}.`}
      />
      <Banner searchParams={searchParams} />
      <FilterBar
        values={searchParams}
        filters={[
          { name: "status", label: "Status", options: KYC_STATUSES.map((s) => ({ value: s, label: humanize(s) })) },
          { name: "risk", label: "Risk", options: Object.entries(RISK_BANDS).map(([k, b]) => ({ value: k, label: b.label })) },
        ]}
      />
      <DataTable<KycCaseWithAnalyst>
        rows={cases}
        rowHref={(c) => appHref(APP_ID, c.id)}
        empty="No cases match these filters."
        columns={[
          { key: "customerName", header: "Customer" },
          { key: "country", header: "Country" },
          { key: "riskScore", header: "Risk", render: (c) => <RiskScore score={c.riskScore} band={riskBand(c.riskScore)} /> },
          { key: "taxId", header: canSeeField(user, kycPolicy, "taxId") ? "Tax ID" : "Tax ID (masked)", render: (c) => <code className="text-xs">{c.taxId}</code> },
          { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
          { key: "assignedAnalyst", header: "Analyst", render: (c) => c.assignedAnalyst?.name ?? <span className="text-slate-400">Unassigned</span> },
          { key: "vendorResult", header: "Vendor check", render: (c) => <StatusBadge status={c.vendorResult} /> },
          { key: "createdAt", header: "Created", render: (c) => c.createdAt.toLocaleDateString() },
        ]}
      />
      <p className="text-xs text-slate-500">{cases.length} case{cases.length === 1 ? "" : "s"}</p>
    </>
  );
}
