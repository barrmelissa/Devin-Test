"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { USER_COOKIE, getUserById } from ".";

export async function switchUser(formData: FormData) {
  const id = String(formData.get("userId") ?? "");
  if (!(await getUserById(id))) throw new Error("Unknown user");
  (await cookies()).set(USER_COOKIE, id, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/");
}
