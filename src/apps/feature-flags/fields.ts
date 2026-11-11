import type { FieldSpec } from "@/foundation/forms";
import { FLAG_KEY_MAX_LENGTH, OWNER_TEAMS } from "./config";

export const NEW_FLAG_FIELDS: FieldSpec[] = [
  {
    name: "key", label: "Key", required: true, maxLength: FLAG_KEY_MAX_LENGTH, placeholder: "new_checkout_flow",
    help: "Lowercase snake_case, unique. Cannot be changed later.",
  },
  { name: "description", label: "Description", type: "textarea", required: true, maxLength: 500 },
  { name: "ownerTeam", label: "Owner team", type: "select", required: true, options: OWNER_TEAMS.map((t) => ({ value: t, label: t })) },
];

export const PROD_CHANGE_FIELDS: FieldSpec[] = [
  { name: "enabled", label: "Prod state", type: "select", required: true, options: [{ value: "on", label: "On" }, { value: "off", label: "Off" }] },
  { name: "rolloutPercent", label: "Prod rollout %", type: "number", required: true, min: 0, max: 100, help: "Share of prod traffic that gets the flag when it is on (0-100)." },
  { name: "reason", label: "Reason", type: "textarea", required: true, maxLength: 500, placeholder: "Why this change, and how to roll back" },
];
