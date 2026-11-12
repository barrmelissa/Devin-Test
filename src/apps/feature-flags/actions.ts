"use server";

import { formObject, formString, runAction, runFormAction, type FormState } from "@/foundation/actions";
import { getCurrentUser } from "@/foundation/identity";
import { appHref } from "@/foundation/registry";
import { APP_ID } from "./entity";
import { createFlag, decideProdChange, prodState, requestProdChange, setEnvironment } from "./service";

const flagHref = (id: string) => appHref(APP_ID, id);

/** Where to land after an action: a page of this app (list, pending view or detail), never elsewhere. */
function returnPath(formData: FormData, fallback: string) {
  const to = formString(formData, "returnTo");
  return to === appHref(APP_ID) || to.startsWith(`${appHref(APP_ID)}/`) ? to : fallback;
}

export async function createFlagAction(_state: FormState, formData: FormData) {
  const user = await getCurrentUser();
  return runFormAction(formData, async (input) => {
    const f = await createFlag(user, input);
    return { message: `Flag ${f.key} created (off in every environment).`, redirectTo: flagHref(f.id) };
  });
}

export async function setEnvironmentAction(formData: FormData) {
  const id = formString(formData, "id");
  const environment = formString(formData, "environment");
  const enabled = formString(formData, "enabled") === "on";
  const user = await getCurrentUser();
  return runAction(returnPath(formData, flagHref(id)), async () => {
    const f = await setEnvironment(user, id, environment, enabled);
    return `${f.key} turned ${enabled ? "on" : "off"} in ${environment}.`;
  });
}

export async function requestProdChangeAction(formData: FormData) {
  const id = formString(formData, "id");
  const user = await getCurrentUser();
  return runAction(appHref(APP_ID, id, "request"), async () => {
    const f = await requestProdChange(user, id, formObject(formData));
    return {
      message: `Prod change requested for ${f.key}: ${prodState(f.pendingProdEnabled, f.pendingProdRolloutPercent)}. It applies after a release manager approves it.`,
      redirectTo: flagHref(id),
    };
  });
}

export async function decideProdChangeAction(formData: FormData) {
  const id = formString(formData, "id");
  const transition = formString(formData, "transition");
  const user = await getCurrentUser();
  return runAction(returnPath(formData, flagHref(id)), async () => {
    const f = await decideProdChange(user, id, transition);
    return f.prodChangeStatus === "approved"
      ? `Approved: ${f.key} is now ${prodState(f.prodEnabled, f.prodRolloutPercent)} in prod.`
      : `Rejected the prod change for ${f.key}.`;
  });
}
