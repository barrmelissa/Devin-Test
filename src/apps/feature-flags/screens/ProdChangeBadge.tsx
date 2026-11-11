import { StatusBadge } from "@/foundation/ui";

const TONES = { pending: "bg-amber-100 text-amber-800" };

export function ProdChangeBadge({ status }: { status: string }) {
  if (status === "none") return <span className="text-slate-400">—</span>;
  return <StatusBadge status={status} tones={TONES} />;
}
