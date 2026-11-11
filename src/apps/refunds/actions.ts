"use server";

import { formObject, formString, runAction } from "@/foundation/actions";
import { getCurrentUser } from "@/foundation/identity";
import { appHref } from "@/foundation/registry";
import { humanize } from "@/foundation/ui/StatusBadge";
import { APP_ID } from "./entity";
import { addNote, createRefund, processRefund, transitionRefund } from "./service";

const refundHref = (id: string) => appHref(APP_ID, id);

export async function createRefundAction(formData: FormData) {
  const user = await getCurrentUser();
  return runAction(appHref(APP_ID, "new"), async () => {
    const r = await createRefund(user, formObject(formData));
    return {
      message: r.status === "approved" ? "Refund request submitted and auto-approved." : "Refund request submitted for finance approval.",
      redirectTo: refundHref(r.id),
    };
  });
}

export async function transitionAction(formData: FormData) {
  const id = formString(formData, "id");
  const user = await getCurrentUser();
  return runAction(refundHref(id), async () => {
    const r = await transitionRefund(user, id, formString(formData, "transition"));
    return `Refund ${humanize(r.status).toLowerCase()}.`;
  });
}

export async function processRefundAction(formData: FormData) {
  const id = formString(formData, "id");
  const user = await getCurrentUser();
  return runAction(refundHref(id), async () => {
    const r = await processRefund(user, id);
    if (r.status === "failed") throw new Error(`Payment provider declined the refund: ${r.providerMessage}. Marked as failed.`);
    return `Refund processed (${r.providerRefundId}).`;
  });
}

export async function addNoteAction(formData: FormData) {
  const id = formString(formData, "id");
  const user = await getCurrentUser();
  return runAction(refundHref(id), async () => {
    await addNote(user, id, formString(formData, "note"));
    return "Note added.";
  });
}
