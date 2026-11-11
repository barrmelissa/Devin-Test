"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass } from "./Form";

/**
 * Calls a same-origin app endpoint (/api/<app>/<route>) with the user's session and shows the
 * result. Used for demo triggers; the endpoint enforces its own permissions server-side.
 */
export function ApiButton({ endpoint, body, label }: { endpoint: string; body: Record<string, unknown>; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string; href?: string } | null>(null);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string; href?: string };
      setResult(res.ok ? { ok: true, text: data.message ?? "Done.", href: data.href } : { ok: false, text: data.error ?? `Request failed (${res.status}).` });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} disabled={busy} className={buttonClass("default")}>
        {busy ? "Sending…" : label}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`max-w-xs text-right text-xs ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {result.text} {result.href && <Link href={result.href} className="underline">Open case</Link>}
        </p>
      )}
    </div>
  );
}
