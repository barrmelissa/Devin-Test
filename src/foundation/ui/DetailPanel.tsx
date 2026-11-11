import type { ReactNode } from "react";

export function DetailPanel({
  title,
  fields,
  children,
  actions,
}: {
  title: string;
  fields?: { label: string; value: ReactNode }[];
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {actions}
      </header>
      <div className="px-4 py-3">
        {fields && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-slate-500">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{f.value ?? <span className="text-slate-400">—</span>}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
    </section>
  );
}
