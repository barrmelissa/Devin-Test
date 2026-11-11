import Link from "next/link";
import { assertCan } from "@/foundation/access";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, CreateForm, PageHeader } from "@/foundation/ui";
import { createCaseAction } from "../actions";
import { APP_ID, KycCaseEntity } from "../entity";
import { getNewCaseFields } from "../service";

export async function NewCase({ user, searchParams }: Omit<AppScreenProps, "path">) {
  assertCan(user, "create", { entity: KycCaseEntity });
  const fields = await getNewCaseFields();
  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to queue</Link>
      <PageHeader title="New KYC case" subtitle="Creates a case in New status. The tax ID is encrypted at rest and the creation is audited." />
      <Banner searchParams={searchParams} />
      <CreateForm title="Case details" fields={fields} action={createCaseAction} submitLabel="Create case" cancelHref={appHref(APP_ID)} />
    </>
  );
}
