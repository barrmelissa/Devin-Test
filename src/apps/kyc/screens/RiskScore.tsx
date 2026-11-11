const TONE = { low: "text-emerald-700", medium: "text-amber-700", high: "text-rose-700 font-semibold" };

export function RiskScore({ score, band }: { score: number; band: keyof typeof TONE }) {
  return <span className={TONE[band]}>{score}</span>;
}
