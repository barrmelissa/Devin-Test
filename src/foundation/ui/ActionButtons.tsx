import { Button } from "./Form";

export type ActionButtonDef = {
  label: string;
  action: (formData: FormData) => Promise<void>;
  fields?: Record<string, string>;
  variant?: "primary" | "danger" | "default";
  /** Rendered disabled with the reason as a tooltip and caption. The server still enforces the rule. */
  disabledReason?: string;
};

export function ActionButtons({ actions, empty }: { actions: ActionButtonDef[]; empty?: string }) {
  if (actions.length === 0) return empty ? <p className="text-sm text-slate-500">{empty}</p> : null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <form key={a.label} action={a.action}>
            {Object.entries(a.fields ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <Button variant={a.variant} disabled={!!a.disabledReason} title={a.disabledReason}>{a.label}</Button>
          </form>
        ))}
      </div>
      {actions.filter((a) => a.disabledReason).map((a) => (
        <p key={a.label} className="text-xs text-amber-700">{a.label}: {a.disabledReason}</p>
      ))}
    </div>
  );
}
