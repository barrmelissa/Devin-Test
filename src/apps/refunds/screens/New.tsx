import Link from "next/link";
import { assertCan } from "@/foundation/access";
import type { AppScreenProps } from "@/foundation/registry";
import { appHref } from "@/foundation/registry";
import { Banner, CreateForm, PageHeader } from "@/foundation/ui";
import { createRefundAction } from "../actions";
import { AUTO_APPROVE_LIMIT_CENTS } from "../config";
import { APP_ID, RefundEntity } from "../entity";
import { REFUND_FIELDS } from "../fields";
import { formatMoney } from "../service";

export async function New({ user, searchParams }: Omit<AppScreenProps, "path">) {
  assertCan(user, "create", { entity: RefundEntity });
  return (
    <>
      <Link href={appHref(APP_ID)} className="text-sm text-indigo-700 hover:underline">← Back to dashboard</Link>
      <PageHeader title="New refund request" subtitle={`Refunds up to ${formatMoney(AUTO_APPROVE_LIMIT_CENTS)} are auto-approved on submit; larger ones go to finance for approval.`} />
      <Banner searchParams={searchParams} />
      <CreateForm title="Refund details" fields={REFUND_FIELDS} action={createRefundAction} submitLabel="Submit refund request" cancelHref={appHref(APP_ID)} />
    </>
  );
}
