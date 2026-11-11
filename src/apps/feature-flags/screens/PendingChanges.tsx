import Link from "next/link";
import { can } from "@/foundation/access";
import { availableTransitions } from "@/foundation/approvals";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { ActionButtons, Banner, DataTable, PageHeader } from "@/foundation/ui";
import { decideProdChangeAction } from "../actions";
import { APP_ID, FeatureFlagEntity, flagWorkflow } from "../entity";
import { listPendingProdChanges, prodState, type FlagWithUsers } from "../service";

export async function PendingChanges({ user, searchParams }: Omit<AppScreenProps, "path">) {
  const flags = await listPendingProdChanges(user);
  const returnTo = appHref(APP_ID, "pending");
  const decide = (f: FlagWithUsers) => {
    if (!can(user, "transition", { entity: FeatureFlagEntity, record: f })) return <span className="text-xs text-slate-400">Read-only</span>;
    const actions = availableTransitions(user, flagWorkflow, f).filter((t) => t.name !== "request");
    return (
      <ActionButtons
        empty="Release managers decide"
        actions={actions.map((t) => ({ label: t.label, action: decideProdChangeAction, fields: { id: f.id, transition: t.name, returnTo }, variant: t.variant, disabledReason: t.reason }))}
      />
    );
  };

  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to flags</Link>
      <PageHeader title="Pending prod changes" subtitle="Prod flag changes waiting for approval, oldest first. Approving pushes the change to the flag service; you cannot approve your own request." />
      <Banner searchParams={searchParams} />
      <DataTable<FlagWithUsers>
        rows={flags}
        rowHref={(f) => appHref(APP_ID, f.id)}
        empty="No pending prod changes."
        columns={[
          { key: "key", header: "Flag", render: (f) => <code>{f.key}</code> },
          { key: "ownerTeam", header: "Owner" },
          {
            key: "change", header: "Prod change",
            render: (f) => <span>{prodState(f.prodEnabled, f.prodRolloutPercent)} → <strong>{prodState(f.pendingProdEnabled, f.pendingProdRolloutPercent)}</strong></span>,
          },
          { key: "prodChangeReason", header: "Reason", className: "max-w-xs text-xs text-slate-600" },
          {
            key: "requested", header: "Requested",
            render: (f) => <span className="text-xs text-slate-600">{f.prodChangeRequestedBy?.name}<br />{f.prodChangeRequestedAt?.toLocaleString()}</span>,
          },
          { key: "actions", header: "Decision", render: decide },
        ]}
      />
      <p className="text-xs text-slate-500">{flags.length} pending</p>
    </>
  );
}
