import Link from "next/link";
import type { FieldSpec } from "../forms";
import { DetailPanel } from "./DetailPanel";
import { Form } from "./Form";

/**
 * The standard governed create screen. Pair with createFromInput() in the app's service using the
 * same `fields`, so browser validation (required/min/max) mirrors the server-side checks.
 */
export function CreateForm({
  title,
  fields,
  action,
  submitLabel = "Create",
  cancelHref,
  note,
}: {
  title: string;
  fields: FieldSpec[];
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
  note?: string;
}) {
  return (
    <div className="max-w-xl">
      <DetailPanel
        title={title}
        actions={cancelHref && <Link href={cancelHref} className="text-sm text-indigo-700 hover:underline">Cancel</Link>}
      >
        {note && <p className="mb-3 text-xs text-slate-500">{note}</p>}
        <Form action={action} fields={fields} submitLabel={submitLabel} />
      </DetailPanel>
    </div>
  );
}
