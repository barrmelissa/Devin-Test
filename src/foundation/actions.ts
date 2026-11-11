import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { errorMessage } from "./errors";

/**
 * Wraps a server action: runs it, then redirects back to `path` with either
 * ?flash=<message> or ?error=<message>. Foundation errors (Forbidden, Transition, ...) surface as banners.
 */
export async function runAction(path: string, fn: () => Promise<string | void>): Promise<never> {
  let target: string;
  try {
    const message = await fn();
    target = `${path}?flash=${encodeURIComponent(message || "Saved.")}`;
  } catch (e) {
    target = `${path}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  revalidatePath(path);
  redirect(target);
}

export function formString(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}
