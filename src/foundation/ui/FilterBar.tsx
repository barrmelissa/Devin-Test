export function FilterBar({
  filters,
  values,
}: {
  filters: { name: string; label: string; options: { value: string; label: string }[] }[];
  values: Record<string, string | undefined>;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      {filters.map((f) => (
        <label key={f.name} className="text-sm">
          <span className="block text-xs text-slate-500">{f.label}</span>
          <select name={f.name} defaultValue={values[f.name] ?? ""} className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">All</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
      <button type="submit" className="rounded-md bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50">Apply</button>
    </form>
  );
}
