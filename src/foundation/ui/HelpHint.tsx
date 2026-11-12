import type { TransitionDef } from "../approvals/workflow";
import { roleLabels } from "../registry";

/**
 * A small "?" next to an action. Explains what happens; who can do it is read from the workflow
 * transition so it always matches what the server enforces.
 */
export function HelpHint({ text, transition, label = "What does this do?" }: { text: string; transition?: TransitionDef; label?: string }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary
        aria-label={label}
        title={label}
        className="flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 hover:bg-indigo-100 hover:text-indigo-800 [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div role="note" className="absolute right-0 z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 text-left text-xs font-normal leading-relaxed text-slate-700 shadow-lg">
        <p>{text}</p>
        {transition && (
          <p className="mt-2 text-slate-500">
            <span className="font-medium text-slate-700">Who can do this:</span> {roleLabels(transition.roles).join(", ")}
            {transition.requiresChecker && ", but not the person who submitted it (maker-checker)"}. Checked on the server and recorded in the audit log.
          </p>
        )}
      </div>
    </details>
  );
}
