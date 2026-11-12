"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "guide-banner-dismissed";

/** First-visit "New here?" banner. Dismissal is remembered in this browser (localStorage). */
export function GuideBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(localStorage.getItem(KEY) !== "1"), []);
  if (!show || pathname === "/guide") return null;
  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setShow(false);
  };
  return (
    <div role="status" className="flex items-center justify-between gap-4 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-900">
      <span>
        New here? <Link href="/guide" onClick={dismiss} className="font-medium underline">Start with the guide</Link>: what this platform is, how to switch users, and a demo path for each app.
      </span>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded px-2 text-indigo-700 hover:bg-indigo-100">×</button>
    </div>
  );
}
