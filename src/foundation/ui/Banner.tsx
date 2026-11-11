export function Banner({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  if (searchParams.error) {
    return <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{searchParams.error}</div>;
  }
  if (searchParams.flash) {
    return <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{searchParams.flash}</div>;
  }
  return null;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
