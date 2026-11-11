import Link from "next/link";
import { assertCan } from "@/foundation/access";
import { assertTransition } from "@/foundation/approvals";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, DetailPanel, Form, PageHeader } from "@/foundation/ui";
import { requestProdChangeAction } from "../actions";
import { APP_ID, FeatureFlagEntity, flagWorkflow } from "../entity";
import { PROD_CHANGE_FIELDS } from "../fields";
import { getFlag, prodState } from "../service";

export async function RequestProdChange({ user, id, searchParams }: Omit<AppScreenProps, "path"> & { id: string }) {
  const flag = await getFlag(user, id);
  assertCan(user, "transition", { entity: FeatureFlagEntity, record: flag });
  const back = <Link href={appHref(APP_ID, flag.id)} className="text-sm text-indigo-700 hover:underline">← Back to {flag.key}</Link>;
  try {
    assertTransition(user, flagWorkflow, flag, "request");
  } catch (e) {
    return (
      <>
        {back}
        <PageHeader title={`Request prod change: ${flag.key}`} />
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{(e as Error).message}</div>
      </>
    );
  }
  const enabled = searchParams.enabled === "on" || searchParams.enabled === "off" ? searchParams.enabled : flag.prodEnabled ? "on" : "off";
  const defaults: Record<string, string> = {
    enabled,
    rolloutPercent: String(enabled === "on" && !flag.prodEnabled && flag.prodRolloutPercent === 0 ? 100 : flag.prodRolloutPercent),
  };
  const fields = PROD_CHANGE_FIELDS.map((f) => (defaults[f.name] ? { ...f, defaultValue: defaults[f.name] } : f));

  return (
    <>
      {back}
      <PageHeader title={`Request prod change: ${flag.key}`} subtitle="Nothing changes in prod until a release manager (not you) approves this request." />
      <Banner searchParams={searchParams} />
      <div className="max-w-xl">
        <DetailPanel title="Change request">
          <p className="mb-3 text-sm text-slate-700">Current prod state: <strong data-testid="prod-current">{prodState(flag.prodEnabled, flag.prodRolloutPercent)}</strong></p>
          <Form action={requestProdChangeAction} hidden={{ id: flag.id }} fields={fields} submitLabel="Submit change request" />
        </DetailPanel>
      </div>
    </>
  );
}
