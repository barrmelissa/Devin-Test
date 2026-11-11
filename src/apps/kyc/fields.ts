import type { FieldSpec } from "@/foundation/forms";

export const COUNTRIES: Record<string, string> = {
  AE: "United Arab Emirates", AU: "Australia", AZ: "Azerbaijan", BG: "Bulgaria", BR: "Brazil", BY: "Belarus",
  CA: "Canada", CH: "Switzerland", CU: "Cuba", DE: "Germany", ES: "Spain", FR: "France", GB: "United Kingdom",
  GH: "Ghana", HK: "Hong Kong", IE: "Ireland", IN: "India", IR: "Iran", IT: "Italy", JP: "Japan", KE: "Kenya",
  KP: "North Korea", KY: "Cayman Islands", MT: "Malta", MX: "Mexico", NG: "Nigeria", NL: "Netherlands",
  PA: "Panama", PH: "Philippines", PL: "Poland", PT: "Portugal", RU: "Russia", SE: "Sweden", SG: "Singapore",
  SY: "Syria", US: "United States", ZA: "South Africa",
};

const countryOptions = Object.entries(COUNTRIES)
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(([value, name]) => ({ value, label: `${name} (${value})` }));

/** Fields the onboarding system sends to POST /api/kyc/intake. */
export const INTAKE_FIELDS: FieldSpec[] = [
  { name: "customerName", label: "Customer name", required: true, maxLength: 200 },
  { name: "country", label: "Country", type: "select", required: true, options: countryOptions },
  { name: "taxId", label: "Tax ID", required: true, maxLength: 40 },
  { name: "riskScore", label: "Risk score", type: "number", required: true, min: 0, max: 100, help: "0 (low) to 100 (high)" },
];

/** Fields on the manual "New case" form. Analyst options come from the user directory. */
export function newCaseFields(analysts: { id: string; name: string }[]): FieldSpec[] {
  return [
    ...INTAKE_FIELDS,
    { name: "assignedAnalystId", label: "Assigned analyst", type: "select", options: analysts.map((a) => ({ value: a.id, label: a.name })) },
    { name: "notes", label: "Notes", type: "textarea", maxLength: 2000 },
  ];
}
