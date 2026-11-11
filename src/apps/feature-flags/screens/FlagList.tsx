import Link from "next/link";
import { can } from "@/foundation/access";
import { availableTransitions } from "@/foundation/approvals";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, DataTable, FilterBar, PageHeader, buttonClass, humanize } from "@/foundation/ui";
import { OWNER_TEAMS } from "../config";
import { APP_ID, FeatureFlagEntity, PROD_CHANGE_STATUSES, flagWorkflow } from "../entity";
import { listFlags, type FlagWithUsers } from "../service";
import { ProdChangeBadge } from "./ProdChangeBadge";
import { EnvToggle, ProdToggle } from "./Toggle";

export async function FlagList({ user, searchParams }: Omit<AppScreenProps, "path">) {
  const flags = await listFlags(user, { team: searchParams.team, change: searchParams.change });
  const pendingCount = flags.filter((f) => f.prodChangeStatus === "pending").length;
  const canUpdate = can(user, "update", { entity: FeatureFlagEntity });
  const canRequest = (f: FlagWithUsers) =>
    can(user, "transition", { entity: FeatureFlagEntity, record: f }) && availableTransitions(user, flagWorkflow, f).some((t) => t.name === "request");
  const returnTo = appHref(APP_ID);

  return (
    <>
      <PageHeader
        title="Feature flags"
        subtitle={canUpdate ? "Dev and staging toggles apply immediately. Prod changes open a change request that a release manager must approve." : "Read-only view of every flag."}
      >
        <div className="flex items-start gap-2">
          <Link href={appHref(APP_ID, "pending")} className={buttonClass("default")}>Pending prod changes</Link>
          {can(user, "create", { entity: FeatureFlagEntity }) && <Link href={appHref(APP_ID, "new")} className={buttonClass("primary")}>New flag</Link>}
        </div>
      </PageHeader>
      <Banner searchParams={searchParams} />
      <FilterBar
        values={searchParams}
        filters={[
          { name: "team", label: "Owner team", options: OWNER_TEAMS.map((t) => ({ value: t, label: t })) },
          { name: "change", label: "Prod change", options: PROD_CHANGE_STATUSES.map((s) => ({ value: s, label: s === "none" ? "No request yet" : humanize(s) })) },
        ]}
      />
      <DataTable<FlagWithUsers>
        rows={flags}
        rowHref={(f) => appHref(APP_ID, f.id)}
        empty="No flags match these filters."
        columns={[
          { key: "key", header: "Key", render: (f) => <code>{f.key}</code> },
          { key: "ownerTeam", header: "Owner" },
          { key: "devEnabled", header: "Dev", render: (f) => <EnvToggle id={f.id} environment="dev" on={f.devEnabled} canChange={canUpdate} returnTo={returnTo} /> },
          { key: "stagingEnabled", header: "Staging", render: (f) => <EnvToggle id={f.id} environment="staging" on={f.stagingEnabled} canChange={canUpdate} returnTo={returnTo} /> },
          {
            key: "prodEnabled", header: "Prod",
            render: (f) => <ProdToggle on={f.prodEnabled} rolloutPercent={f.prodRolloutPercent} pending={f.prodChangeStatus === "pending"} requestHref={canRequest(f) ? appHref(APP_ID, f.id, "request") : undefined} />,
          },
          { key: "prodChangeStatus", header: "Prod change", render: (f) => <ProdChangeBadge status={f.prodChangeStatus} /> },
          {
            key: "lastChangedAt", header: "Last changed",
            render: (f) => <span className="text-xs text-slate-600">{f.lastChangedBy?.name}<br />{f.lastChangedAt.toLocaleString()}</span>,
          },
        ]}
      />
      <p className="text-xs text-slate-500">{flags.length} flag{flags.length === 1 ? "" : "s"}{pendingCount ? ` · ${pendingCount} with a pending prod change` : ""}</p>
    </>
  );
}
