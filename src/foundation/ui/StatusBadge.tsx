const TONES: Record<string, string> = {
  new: "bg-sky-100 text-sky-800",
  in_review: "bg-indigo-100 text-indigo-800",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  escalated: "bg-fuchsia-100 text-fuchsia-800",
  pass: "bg-emerald-100 text-emerald-800",
  fail: "bg-rose-100 text-rose-800",
  review: "bg-amber-100 text-amber-800",
};

export function humanize(value: string) {
  return value.replace(/[_:]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusBadge({ status, tones = {} }: { status: string | null | undefined; tones?: Record<string, string> }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const tone = tones[status] ?? TONES[status] ?? "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{humanize(status)}</span>;
}
