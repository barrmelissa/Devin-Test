import Link from "next/link";
import { assertCan } from "@/foundation/access";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, CreateForm, PageHeader } from "@/foundation/ui";
import { createFlagAction } from "../actions";
import { APP_ID, FeatureFlagEntity } from "../entity";
import { NEW_FLAG_FIELDS } from "../fields";

export async function NewFlag({ user, searchParams }: Omit<AppScreenProps, "path">) {
  assertCan(user, "create", { entity: FeatureFlagEntity });
  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to flags</Link>
      <PageHeader title="New feature flag" subtitle="New flags start off in dev, staging and prod (0% rollout). The creation is audited." />
      <Banner searchParams={searchParams} />
      <CreateForm title="Flag details" fields={NEW_FLAG_FIELDS} action={createFlagAction} submitLabel="Create flag" cancelHref={appHref(APP_ID)} />
    </>
  );
}
