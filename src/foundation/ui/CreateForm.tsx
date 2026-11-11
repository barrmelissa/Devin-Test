"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "../actions";
import type { FieldSpec } from "../forms";
import { DetailPanel } from "./DetailPanel";
import { Form } from "./Form";

/**
 * The standard governed create screen. Pair with createFromInput() in the app's service using the
 * same `fields`, so browser validation (required/min/max) mirrors the server-side checks.
 * `action` wraps its work in runFormAction(): on a server-side error the message is shown here and
 * the form keeps what the user typed.
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
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
  cancelHref?: string;
  note?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <div className="max-w-xl">
      <DetailPanel
        title={title}
        actions={cancelHref && <Link href={cancelHref} className="text-sm text-indigo-700 hover:underline">Cancel</Link>}
      >
        {note && <p className="mb-3 text-xs text-slate-500">{note}</p>}
        {state.error && (
          <div role="alert" className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{state.error}</div>
        )}
        {/* Remount on each result so the inputs pick up the returned values even after React's form reset. */}
        <Form key={JSON.stringify(state)} action={formAction} fields={fields} values={state.values} submitLabel={submitLabel} />
      </DetailPanel>
    </div>
  );
}
