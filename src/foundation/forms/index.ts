import { ValidationError } from "../errors";

/**
 * One field definition drives both the shared form UI (CreateForm / Form) and server-side
 * validation (parseInput), so a create flow can't drift between what's shown and what's enforced.
 */
export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number";
  required?: boolean;
  /** number: inclusive bounds; integer-only unless `decimal` is set. */
  min?: number;
  max?: number;
  decimal?: boolean;
  maxLength?: number;
  /** select: allowed values. Anything else is rejected server-side. */
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  help?: string;
};

export type ParsedInput = Record<string, string | number | null>;

/** Validates untrusted input (form or JSON) against field specs. Unknown keys are dropped. */
export function parseInput(fields: FieldSpec[], input: Record<string, unknown>): ParsedInput {
  const out: ParsedInput = {};
  const errors: string[] = [];
  for (const f of fields) {
    const raw = input[f.name];
    const str = raw == null ? "" : String(raw).trim();
    if (!str) {
      if (f.required) errors.push(`${f.label} is required.`);
      out[f.name] = null;
      continue;
    }
    if (f.type === "number") {
      const n = Number(str);
      if (!Number.isFinite(n) || (!f.decimal && !Number.isInteger(n))) {
        errors.push(`${f.label} must be ${f.decimal ? "a number" : "a whole number"}.`);
      } else if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        errors.push(`${f.label} must be between ${f.min ?? "-∞"} and ${f.max ?? "∞"}.`);
      } else {
        out[f.name] = n;
      }
      continue;
    }
    if (f.maxLength !== undefined && str.length > f.maxLength) {
      errors.push(`${f.label} must be at most ${f.maxLength} characters.`);
      continue;
    }
    if (f.options && !f.options.some((o) => o.value === str)) {
      errors.push(`${f.label} has an invalid value.`);
      continue;
    }
    out[f.name] = str;
  }
  if (errors.length) throw new ValidationError(errors.join(" "));
  return out;
}
