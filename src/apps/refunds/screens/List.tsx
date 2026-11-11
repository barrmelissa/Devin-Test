import Link from "next/link";
import { can } from "@/foundation/access";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, DataTable, FilterBar, PageHeader, StatusBadge, buttonClass, humanize } from "@/foundation/ui";
import { AUTO_APPROVE_LIMIT_CENTS } from "../config";
import { APP_ID, REFUND_REASONS, REFUND_STATUSES, RefundEntity } from "../entity";
import { formatMoney, listRefunds, needsApproval, reasonLabel, refundSummary, weekAgo, type RefundWithUsers } from "../service";
import { REFUND_TONES } from "./tones";

function Tile({ label, value, href, tone }: { label: string; value: number; href: string; tone: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`} data-testid={`tile-${label}`}>{value}</p>
    </Link>
  );
}

export async function List({ user, searchParams }: Omit<AppScreenProps, "path">) {
  const [refunds, summary] = await Promise.all([
    listRefunds(user, { status: searchParams.status, reason: searchParams.reason, processedSince: searchParams.window === "7d" ? weekAgo() : undefined }),
    refundSummary(user),
  ]);
  const base = appHref(APP_ID);
  return (
    <>
      <PageHeader
        title="Refunds dashboard"
        subtitle={`Refunds over ${formatMoney(AUTO_APPROVE_LIMIT_CENTS)} need finance approval; smaller ones are auto-approved.${can(user, "transition", { entity: RefundEntity }) ? "" : " Read-only access."}`}
      >
        {can(user, "create", { entity: RefundEntity }) && <Link href={appHref(APP_ID, "new")} className={buttonClass("primary")}>New refund request</Link>}
      </PageHeader>
      <Banner searchParams={searchParams} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Pending approval" value={summary.pendingApproval} href={`${base}?status=submitted`} tone="text-amber-700" />
        <Tile label="Processed this week" value={summary.processedThisWeek} href={`${base}?status=processed&window=7d`} tone="text-sky-700" />
        <Tile label="Failed" value={summary.failed} href={`${base}?status=failed`} tone="text-rose-700" />
      </div>
      {searchParams.window === "7d" && (
        <p className="text-sm text-slate-600">Showing refunds processed in the last 7 days. <Link href={`${base}?status=processed`} className="text-indigo-700 hover:underline">Show all processed</Link></p>
      )}
      {/* Keyed so the selects reset when the URL changes via a tile link (defaultValue only applies on mount). */}
      <FilterBar
        key={new URLSearchParams(Object.entries(searchParams).filter((e): e is [string, string] => !!e[1])).toString()}
        values={searchParams}
        filters={[
          { name: "status", label: "Status", options: REFUND_STATUSES.map((s) => ({ value: s, label: humanize(s) })) },
          { name: "reason", label: "Reason", options: Object.entries(REFUND_REASONS).map(([value, label]) => ({ value, label })) },
        ]}
      />
      <DataTable<RefundWithUsers>
        rows={refunds}
        rowHref={(r) => appHref(APP_ID, r.id)}
        empty="No refunds match these filters."
        columns={[
          { key: "customerName", header: "Customer" },
          { key: "transactionId", header: "Transaction", render: (r) => <code className="text-xs">{r.transactionId}</code> },
          { key: "refundAmountCents", header: "Refund", render: (r) => (
            <span>{formatMoney(r.refundAmountCents, r.currency)}{needsApproval(r.refundAmountCents) && <span className="ml-1 text-xs text-amber-700" title="Over the auto-approve threshold">●</span>}</span>
          ) },
          { key: "originalAmountCents", header: "Original", render: (r) => <span className="text-slate-500">{formatMoney(r.originalAmountCents, r.currency)}</span> },
          { key: "reason", header: "Reason", render: (r) => reasonLabel(r.reason) },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} tones={REFUND_TONES} /> },
          { key: "requestedBy", header: "Requested by", render: (r) => r.requestedBy.name },
          { key: "createdAt", header: "Created", render: (r) => r.createdAt.toLocaleDateString() },
        ]}
      />
      <p className="text-xs text-slate-500">{refunds.length} refund{refunds.length === 1 ? "" : "s"}. ● = over {formatMoney(AUTO_APPROVE_LIMIT_CENTS)}, requires approval.</p>
    </>
  );
}
