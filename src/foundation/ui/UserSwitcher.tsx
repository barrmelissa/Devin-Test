"use client";

import { useRef } from "react";

export function UserSwitcher({
  users,
  currentId,
  action,
}: {
  users: { id: string; name: string }[];
  currentId: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} className="flex items-center gap-2 text-sm">
      <label htmlFor="user-switcher" className="text-slate-300">Signed in as</label>
      <select
        id="user-switcher"
        name="userId"
        defaultValue={currentId}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-white"
      >
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    </form>
  );
}
