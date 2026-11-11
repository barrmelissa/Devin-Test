import Link from "next/link";
import { setEnvironmentAction } from "../actions";

const base = "inline-flex min-w-[3.25rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold";
const tone = (on: boolean) => (on ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600");

function label(on: boolean, rolloutPercent?: number) {
  return on ? (rolloutPercent === undefined ? "On" : `On ${rolloutPercent}%`) : "Off";
}

/** Dev/staging switch: clicking applies the change immediately (if the user may update). */
export function EnvToggle({ id, environment, on, canChange, returnTo }: { id: string; environment: "dev" | "staging"; on: boolean; canChange: boolean; returnTo: string }) {
  if (!canChange) return <span className={`${base} ${tone(on)}`} data-testid={`${environment}-state`}>{label(on)}</span>;
  return (
    <form action={setEnvironmentAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="environment" value={environment} />
      <input type="hidden" name="enabled" value={on ? "off" : "on"} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button aria-pressed={on} title={`Turn ${on ? "off" : "on"} in ${environment} (applies immediately)`} className={`${base} ${tone(on)} hover:ring-2 hover:ring-indigo-300`} data-testid={`${environment}-toggle`}>
        {label(on)}
      </button>
    </form>
  );
}

/** Prod switch: never applies. It opens a change-request form pre-filled with the flipped state. */
export function ProdToggle({ on, rolloutPercent, requestHref, pending }: { on: boolean; rolloutPercent: number; requestHref?: string; pending: boolean }) {
  const pill = <span className={`${base} ${tone(on)}`}>{label(on, rolloutPercent)}</span>;
  if (pending || !requestHref) {
    return <span className="inline-flex items-center gap-1" data-testid="prod-state">{pill}{pending && <span className="text-xs text-amber-700">change pending</span>}</span>;
  }
  return (
    <Link href={`${requestHref}?enabled=${on ? "off" : "on"}`} title="Prod changes need approval: opens a change request" className="inline-flex items-center gap-1 hover:opacity-80" data-testid="prod-toggle">
      {pill}<span className="text-xs text-indigo-700">request…</span>
    </Link>
  );
}
