import Link from "next/link";
import { can, canSeeField } from "@/foundation/access";
import { availableTransitions } from "@/foundation/approvals";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { ActionButtons, AuditTrail, Banner, DetailPanel, Form, HelpHint, PageHeader, StatusBadge, humanize } from "@/foundation/ui";
import { addNoteAction, runVendorCheckAction, transitionAction } from "../actions";
import { APP_ID, KycCaseEntity, kycPolicy, kycWorkflow } from "../entity";
import { kycHelp } from "../help";
import { getCase, getCaseHistory, riskBand } from "../service";
import { RiskScore } from "./RiskScore";

const OPEN_STATUSES = ["new", "in_review", "pending_approval", "escalated"];

export async function CaseDetail({ user, id, searchParams }: Omit<AppScreenProps, "path"> & { id: string }) {
  const [kase, history] = await Promise.all([getCase(user, id), getCaseHistory(user, id)]);
  const canUpdate = can(user, "update", { entity: KycCaseEntity, record: kase });
  const canTransition = can(user, "transition", { entity: KycCaseEntity, record: kase });
  const transitions = canTransition ? availableTransitions(user, kycWorkflow, kase) : [];
  const submit = transitions.find((t) => t.name === "submit");
  const buttons = transitions.filter((t) => t.name !== "submit");
  const taxIdVisible = canSeeField(user, kycPolicy, "taxId");

  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to queue</Link>
      <PageHeader title={kase.customerName} subtitle={`Case ${kase.id}`}>
        <StatusBadge status={kase.status} />
      </PageHeader>
      <Banner searchParams={searchParams} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <DetailPanel
            title="Case details"
            fields={[
              { label: "Customer", value: kase.customerName },
              { label: "Country", value: kase.country },
              { label: "Risk score", value: <RiskScore score={kase.riskScore} band={riskBand(kase.riskScore)} /> },
              { label: taxIdVisible ? "Tax ID" : "Tax ID (masked for your role)", value: <code data-testid="tax-id">{kase.taxId}</code> },
              { label: "Status", value: <StatusBadge status={kase.status} /> },
              { label: "Assigned analyst", value: kase.assignedAnalyst?.name ?? "Unassigned" },
              { label: "Submitted by", value: kase.submittedBy?.name },
              { label: "Recommendation", value: kase.recommendation && humanize(kase.recommendation) },
              { label: "Created", value: kase.createdAt.toLocaleString() },
            ]}
          />

          <DetailPanel
            title="Vendor check (sanctions / ID)"
            actions={canUpdate && kase.status === "in_review" ? (
              <form action={runVendorCheckAction}>
                <input type="hidden" name="id" value={kase.id} />
                <button className="rounded-md bg-white px-3 py-1 text-sm ring-1 ring-slate-300 hover:bg-slate-50">
                  {kase.vendorResult ? "Re-run vendor check" : "Run vendor check"}
                </button>
              </form>
            ) : undefined}
            fields={[
              { label: "Result", value: <StatusBadge status={kase.vendorResult} /> },
              { label: "Reason", value: kase.vendorReason },
              { label: "Checked at", value: kase.vendorCheckedAt?.toLocaleString() },
            ]}
          />

          <DetailPanel title="Notes">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{kase.notes || <span className="text-slate-400">No notes yet.</span>}</pre>
            {canUpdate && OPEN_STATUSES.includes(kase.status) && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <Form action={addNoteAction} hidden={{ id: kase.id }} submitLabel="Add note" variant="default"
                  fields={[{ name: "note", label: "Add a note", type: "textarea", required: true }]} />
              </div>
            )}
          </DetailPanel>
        </div>

        <div className="space-y-4">
          <DetailPanel title="Actions">
            {!canTransition ? (
              <p className="text-sm text-slate-500">Read-only access.</p>
            ) : (
              <div className="space-y-4">
                <ActionButtons
                  empty={submit ? undefined : "No actions available for your role in this status."}
                  actions={buttons.map((t) => ({
                    label: t.label,
                    action: transitionAction,
                    fields: { id: kase.id, transition: t.name },
                    variant: t.variant,
                    disabledReason: t.reason,
                    hint: t.name === "approve" ? <HelpHint text={kycHelp.hints.approve} transition={kycWorkflow.transitions.approve} /> : undefined,
                  }))}
                />
                {submit && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      {submit.label} <HelpHint text={kycHelp.hints.submit} transition={kycWorkflow.transitions.submit} />
                    </div>
                    <Form action={transitionAction} hidden={{ id: kase.id, transition: "submit" }} submitLabel={submit.label} variant="primary"
                      fields={[{ name: "recommendation", label: "Recommendation", type: "select", required: true,
                        options: [{ value: "approve", label: "Approve" }, { value: "reject", label: "Reject" }] }]} />
                    {!kase.vendorResult && <p className="mt-2 text-xs text-amber-700">Run the vendor check before submitting.</p>}
                  </div>
                )}
              </div>
            )}
          </DetailPanel>

          <DetailPanel title="Audit history">
            <AuditTrail entries={history} />
          </DetailPanel>
        </div>
      </div>
    </>
  );
}
