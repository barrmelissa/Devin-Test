import Link from "next/link";
import { can } from "@/foundation/access";
import { availableTransitions } from "@/foundation/approvals";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { ActionButtons, AuditTrail, Banner, DetailPanel, PageHeader, buttonClass } from "@/foundation/ui";
import { decideProdChangeAction } from "../actions";
import { APP_ID, FeatureFlagEntity, flagWorkflow } from "../entity";
import { getFlag, getFlagHistory, prodState } from "../service";
import { ProdChangeBadge } from "./ProdChangeBadge";
import { EnvToggle } from "./Toggle";

export async function FlagDetail({ user, id, searchParams }: Omit<AppScreenProps, "path"> & { id: string }) {
  const [flag, history] = await Promise.all([getFlag(user, id), getFlagHistory(user, id)]);
  const canUpdate = can(user, "update", { entity: FeatureFlagEntity, record: flag });
  const canTransition = can(user, "transition", { entity: FeatureFlagEntity, record: flag });
  const transitions = canTransition ? availableTransitions(user, flagWorkflow, flag) : [];
  const request = transitions.find((t) => t.name === "request");
  const decisions = transitions.filter((t) => t.name !== "request");
  const pending = flag.prodChangeStatus === "pending";
  const returnTo = appHref(APP_ID, flag.id);

  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to flags</Link>
      <PageHeader title={flag.key} subtitle={flag.description}>
        <ProdChangeBadge status={flag.prodChangeStatus} />
      </PageHeader>
      <Banner searchParams={searchParams} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <DetailPanel
            title="Flag"
            fields={[
              { label: "Key", value: <code>{flag.key}</code> },
              { label: "Owner team", value: flag.ownerTeam },
              { label: "Last changed by", value: flag.lastChangedBy?.name },
              { label: "Last changed at", value: flag.lastChangedAt.toLocaleString() },
              { label: "Flag service change id", value: flag.flagServiceChangeId && <code className="text-xs">{flag.flagServiceChangeId}</code> },
              { label: "Created", value: flag.createdAt.toLocaleString() },
            ]}
          />

          <DetailPanel title="Environments">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 font-medium">Dev</td>
                  <td className="py-2"><EnvToggle id={flag.id} environment="dev" on={flag.devEnabled} canChange={canUpdate} returnTo={returnTo} /></td>
                  <td className="py-2 text-xs text-slate-500">{canUpdate ? "Applies immediately" : ""}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Staging</td>
                  <td className="py-2"><EnvToggle id={flag.id} environment="staging" on={flag.stagingEnabled} canChange={canUpdate} returnTo={returnTo} /></td>
                  <td className="py-2 text-xs text-slate-500">{canUpdate ? "Applies immediately" : ""}</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Prod</td>
                  <td className="py-2" data-testid="prod-current">{prodState(flag.prodEnabled, flag.prodRolloutPercent)}</td>
                  <td className="py-2 text-xs text-slate-500">Changes need an approved change request</td>
                </tr>
              </tbody>
            </table>
          </DetailPanel>

          <DetailPanel
            title="Prod change request"
            actions={request && (
              <Link href={appHref(APP_ID, flag.id, "request")} className={buttonClass("primary")}>{request.label}</Link>
            )}
          >
            {flag.prodChangeStatus === "none" ? (
              <p className="text-sm text-slate-500">No prod change has been requested for this flag.</p>
            ) : (
              <div className="space-y-3">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-0.5"><ProdChangeBadge status={flag.prodChangeStatus} /></dd></div>
                  {pending && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">Change</dt>
                      <dd className="mt-0.5" data-testid="pending-change">
                        {prodState(flag.prodEnabled, flag.prodRolloutPercent)} → <strong>{prodState(flag.pendingProdEnabled, flag.pendingProdRolloutPercent)}</strong>
                      </dd>
                    </div>
                  )}
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Requested by</dt><dd className="mt-0.5">{flag.prodChangeRequestedBy?.name ?? "—"}</dd></div>
                  <div><dt className="text-xs uppercase tracking-wide text-slate-500">Requested at</dt><dd className="mt-0.5">{flag.prodChangeRequestedAt?.toLocaleString() ?? "—"}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt><dd className="mt-0.5">{flag.prodChangeReason ?? "—"}</dd></div>
                </dl>
                {!pending && <p className="text-xs text-slate-500">Last request was {flag.prodChangeStatus}. See the change history for the decision.</p>}
                {pending && (
                  !canTransition ? (
                    <p className="text-sm text-slate-500">Read-only access.</p>
                  ) : (
                    <ActionButtons
                      empty="Waiting for a release manager to approve or reject."
                      actions={decisions.map((t) => ({
                        label: t.label,
                        action: decideProdChangeAction,
                        fields: { id: flag.id, transition: t.name, returnTo },
                        variant: t.variant,
                        disabledReason: t.reason,
                      }))}
                    />
                  )
                )}
              </div>
            )}
          </DetailPanel>
        </div>

        <div className="space-y-4">
          <DetailPanel title="Change history (audit log)">
            <AuditTrail entries={history} />
          </DetailPanel>
        </div>
      </div>
    </>
  );
}
