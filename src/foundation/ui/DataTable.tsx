import Link from "next/link";
import type { ReactNode } from "react";

export type Column<T> = { key: string; header: string; render?: (row: T) => ReactNode; className?: string };

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowHref,
  empty = "Nothing to show.",
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  empty?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-2 text-left font-medium text-slate-600">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">{empty}</td></tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              {columns.map((c, i) => {
                const value = c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "");
                return (
                  <td key={c.key} className={`px-4 py-2 align-top ${c.className ?? ""}`}>
                    {i === 0 && rowHref ? <Link href={rowHref(row)} className="font-medium text-indigo-700 hover:underline">{value}</Link> : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
