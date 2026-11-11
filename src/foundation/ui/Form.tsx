import type { FieldSpec } from "../forms";

/** Same shape as FieldSpec, so one definition drives the form and server-side parseInput(). */
export type FormFieldDef = FieldSpec;

const inputClass = "mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none";

export function Form({
  action,
  fields,
  submitLabel = "Save",
  hidden = {},
  values = {},
  variant = "primary",
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: FormFieldDef[];
  /** Initial values by field name (e.g. what the user submitted before a validation error). */
  values?: Record<string, string>;
  submitLabel?: string;
  hidden?: Record<string, string>;
  variant?: "primary" | "danger" | "default";
}) {
  return (
    <form action={action} className="space-y-3">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <label key={f.name} className="block text-sm">
          <span className="text-slate-700">{f.label}{f.required && <span className="text-rose-600"> *</span>}</span>
          {f.type === "textarea" ? (
            <textarea name={f.name} required={f.required} placeholder={f.placeholder} defaultValue={values[f.name] ?? f.defaultValue} maxLength={f.maxLength} rows={3} className={inputClass} />
          ) : f.type === "select" ? (
            <select name={f.name} required={f.required} defaultValue={values[f.name] ?? f.defaultValue ?? ""} className={inputClass}>
              <option value="" disabled={f.required}>{f.required ? "Select…" : "None"}</option>
              {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              name={f.name}
              type={f.type ?? "text"}
              required={f.required}
              placeholder={f.placeholder}
              defaultValue={values[f.name] ?? f.defaultValue}
              min={f.min}
              max={f.max}
              step={f.type === "number" ? (f.decimal ? "any" : 1) : undefined}
              maxLength={f.maxLength}
              className={inputClass}
            />
          )}
          {f.help && <span className="mt-1 block text-xs text-slate-500">{f.help}</span>}
        </label>
      ))}
      <Button variant={variant}>{submitLabel}</Button>
    </form>
  );
}

export const VARIANTS = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  default: "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50",
};

export function Button({
  children,
  variant = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      title={title}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]}`}
    >
      {children}
    </button>
  );
}

export function buttonClass(variant: keyof typeof VARIANTS = "default") {
  return `inline-block rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]}`;
}
