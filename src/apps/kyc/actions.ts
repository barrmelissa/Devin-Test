"use server";

import { formString, runAction } from "@/foundation/actions";
import { getCurrentUser } from "@/foundation/identity";
import { appHref } from "@/foundation/registry";
import { humanize } from "@/foundation/ui/StatusBadge";
import { APP_ID } from "./entity";
import { addNote, runVendorCheck, transitionCase } from "./service";

const caseHref = (id: string) => appHref(APP_ID, id);

export async function runVendorCheckAction(formData: FormData) {
  const id = formString(formData, "id");
  const user = await getCurrentUser();
  return runAction(caseHref(id), async () => {
    const c = await runVendorCheck(user, id);
    return `Vendor check result: ${c.vendorResult}. ${c.vendorReason}`;
  });
}

export async function addNoteAction(formData: FormData) {
  const id = formString(formData, "id");
  const user = await getCurrentUser();
  return runAction(caseHref(id), async () => {
    await addNote(user, id, formString(formData, "note"));
    return "Note added.";
  });
}

export async function transitionAction(formData: FormData) {
  const id = formString(formData, "id");
  const transition = formString(formData, "transition");
  const user = await getCurrentUser();
  return runAction(caseHref(id), async () => {
    const c = await transitionCase(user, id, transition, { recommendation: formString(formData, "recommendation") || undefined });
    return `Case moved to ${humanize(c.status)}.`;
  });
}
