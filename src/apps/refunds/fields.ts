import type { FieldSpec } from "@/foundation/forms";
import { CURRENCY } from "./config";
import { REFUND_REASONS } from "./entity";

export const REFUND_FIELDS: FieldSpec[] = [
  { name: "customerName", label: "Customer name", required: true, maxLength: 200 },
  { name: "transactionId", label: "Transaction ID", required: true, maxLength: 64, placeholder: "txn_…", help: "Demo: IDs containing FAIL are declined by the mock payment provider." },
  { name: "originalAmount", label: "Original charge amount (USD)", type: "number", decimal: true, required: true, min: 0.01, max: 1_000_000 },
  { name: "refundAmount", label: "Refund amount (USD)", type: "number", decimal: true, required: true, min: 0.01, max: 1_000_000, help: "Must not exceed the original charge. Over $500 needs finance approval." },
  { name: "currency", label: "Currency", type: "select", required: true, defaultValue: CURRENCY, options: [{ value: CURRENCY, label: CURRENCY }] },
  { name: "reason", label: "Reason", type: "select", required: true, options: Object.entries(REFUND_REASONS).map(([value, label]) => ({ value, label })) },
  { name: "notes", label: "Notes", type: "textarea", maxLength: 2000 },
];
