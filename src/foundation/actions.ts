import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorMessage } from "./errors";

export type ActionResult = string | void | { message: string; redirectTo: string };

/**
 * Wraps a server action: runs it, then redirects back to `path` with either
 * ?flash=<message> or ?error=<message>. Foundation errors (Forbidden, Transition, ...) surface as banners.
 * Return `{ message, redirectTo }` to land somewhere else on success (e.g. the record just created).
 */
export async function runAction(path: string, fn: () => Promise<ActionResult>): Promise<never> {
  let target: string;
  try {
    const result = await fn();
    const message = typeof result === "object" ? result.message : result;
    const dest = typeof result === "object" ? result.redirectTo : path;
    target = `${dest}?flash=${encodeURIComponent(message || "Saved.")}`;
  } catch (e) {
    target = `${path}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  revalidatePath(path);
  redirect(target);
}

export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

export function formString(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}
