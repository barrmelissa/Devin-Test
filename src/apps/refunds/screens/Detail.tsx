import Link from "next/link";
import { can } from "@/foundation/access";
import { availableTransitions } from "@/foundation/approvals";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { ActionButtons, AuditTrail, Banner, DetailPanel, Form, PageHeader, StatusBadge } from "@/foundation/ui";
import { addNoteAction, processRefundAction, transitionAction } from "../actions";
import { AUTO_APPROVE_LIMIT_CENTS } from "../config";
import { APP_ID, MANUAL_TRANSITIONS, RefundEntity, refundWorkflow } from "../entity";
import { formatMoney, getRefund, getRefundHistory, needsApproval, reasonLabel } from "../service";
import { REFUND_TONES } from "./tones";

const NOTE_STATUSES = ["submitted", "approved", "failed"];

export async function Detail({ user, id, searchParams }: Omit<AppScreenProps, "path"> & { id: string }) {
  const [refund, history] = await Promise.all([getRefund(user, id), getRefundHistory(user, id)]);
  const canUpdate = can(user, "update", { entity: RefundEntity, record: refund });
  const canTransition = can(user, "transition", { entity: RefundEntity, record: refund });
  const transitions = canTransition ? availableTransitions(user, refundWorkflow, refund) : [];
  const decisions = transitions.filter((t) => (MANUAL_TRANSITIONS as readonly string[]).includes(t.name));
  const process = transitions.find((t) => t.name === "process_succeeded");
  const money = (cents: number) => formatMoney(cents, refund.currency);

  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to dashboard</Link>
      <PageHeader title={`${refund.customerName}: ${money(refund.refundAmountCents)}`} subtitle={`Refund ${refund.id}`}>
        <StatusBadge status={refund.status} tones={REFUND_TONES} />
      </PageHeader>
      <Banner searchParams={searchParams} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <DetailPanel
            title="Refund details"
            fields={[
              { label: "Customer", value: refund.customerName },
              { label: "Transaction ID", value: <code>{refund.transactionId}</code> },
              { label: "Original charge", value: money(refund.originalAmountCents) },
              { label: "Refund amount", value: money(refund.refundAmountCents) },
              { label: "Currency", value: refund.currency },
              { label: "Reason", value: reasonLabel(refund.reason) },
              { label: "Status", value: <StatusBadge status={refund.status} tones={REFUND_TONES} /> },
              { label: "Approval", value: needsApproval(refund.refundAmountCents) ? `Required (over ${formatMoney(AUTO_APPROVE_LIMIT_CENTS)})` : `Not required (≤ ${formatMoney(AUTO_APPROVE_LIMIT_CENTS)})` },
              { label: "Requested by", value: refund.requestedBy.name },
              { label: "Approved by", value: refund.autoApproved ? `Auto-approved (≤ ${formatMoney(AUTO_APPROVE_LIMIT_CENTS)})` : refund.approvedBy?.name },
              { label: "Created", value: refund.createdAt.toLocaleString() },
            ]}
          />

          <DetailPanel
            title="Payment provider"
            fields={[
              { label: "Result", value: <StatusBadge status={refund.providerStatus} tones={REFUND_TONES} /> },
              { label: "Provider refund ID", value: refund.providerRefundId && <code>{refund.providerRefundId}</code> },
              { label: "Message", value: refund.providerMessage },
              { label: "Processed at", value: refund.processedAt?.toLocaleString() },
            ]}
          />

          <DetailPanel title="Notes">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{refund.notes || <span className="text-slate-400">No notes yet.</span>}</pre>
            {canUpdate && NOTE_STATUSES.includes(refund.status) && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <Form action={addNoteAction} hidden={{ id: refund.id }} submitLabel="Add note" variant="default"
                  fields={[{ name: "note", label: "Add a note", type: "textarea", required: true, maxLength: 2000 }]} />
              </div>
            )}
          </DetailPanel>
        </div>

        <div className="space-y-4">
          <DetailPanel title="Actions">
            {!canTransition ? (
              <p className="text-sm text-slate-500">Read-only access.</p>
            ) : (
              <ActionButtons
                empty="No actions available for your role in this status."
                actions={[
                  ...decisions.map((t) => ({
                    label: t.label,
                    action: transitionAction,
                    fields: { id: refund.id, transition: t.name },
                    variant: t.variant,
                    disabledReason: t.reason,
                  })),
                  ...(process ? [{ label: "Process refund", action: processRefundAction, fields: { id: refund.id }, variant: "primary" as const, disabledReason: process.reason }] : []),
                ]}
              />
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
