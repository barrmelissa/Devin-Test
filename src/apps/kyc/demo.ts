import { COUNTRIES } from "./fields";

// Randomised but realistic onboarding signups for the "Simulate new signup" demo button.
const PEOPLE = ["Amara Nwosu", "Lukas Becker", "Sofia Marques", "Hannah Lindqvist", "Arjun Mehta", "Yuki Tanaka", "Chloé Martin", "Mateo García", "Grace Wanjiru", "Oliver Byrne", "Nadia Haddad", "Piotr Zielinski", "Ana Lima", "Daniel Cohen", "Mei Lin Tan"];
const COMPANY_A = ["Northwind", "Bluefin", "Silverline", "Cedar", "Harbor", "Summit", "Ironbridge", "Lumen", "Redwood", "Atlas"];
const COMPANY_B = ["Trading", "Logistics", "Capital", "Imports", "Software", "Remittance", "Holdings", "Payments", "Foods", "Mining"];
const SUFFIX: Record<string, string> = { US: "LLC", GB: "Ltd", DE: "GmbH", FR: "SAS", NL: "B.V.", SG: "Pte. Ltd.", CA: "Inc.", MT: "Ltd", AE: "FZE", KY: "Ltd", HK: "Ltd" };
const COUNTRY_WEIGHTS = ["US", "US", "US", "GB", "GB", "DE", "FR", "CA", "NL", "SG", "IN", "BR", "MX", "NG", "AE", "MT", "HK", "KY", "PA", "RU", "IR"];

const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

function taxIdFor(country: string, business: boolean): string {
  switch (country) {
    case "US": return business ? `${digits(2)}-${digits(7)}` : `${digits(3)}-${digits(2)}-${digits(4)}`;
    case "GB": return business ? digits(10) : `QQ${digits(6)}C`;
    case "BR": return `${digits(3)}.${digits(3)}.${digits(3)}-${digits(2)}`;
    case "CA": return `${digits(9)}RC0001`;
    case "IN": return `AB${"CDEFP"[Math.floor(Math.random() * 5)]}PK${digits(4)}L`;
    default: return `${country}${digits(9)}`;
  }
}

export function randomSignup() {
  const country = pick(COUNTRY_WEIGHTS);
  const business = Math.random() < 0.55;
  const customerName = business ? `${pick(COMPANY_A)} ${pick(COMPANY_B)} ${SUFFIX[country] ?? "Ltd"}` : pick(PEOPLE);
  const r = Math.random();
  const riskScore = Math.round(r < 0.6 ? Math.random() * 39 : r < 0.85 ? 40 + Math.random() * 29 : 70 + Math.random() * 30);
  return { customerName, country: country in COUNTRIES ? country : "US", taxId: taxIdFor(country, business), riskScore };
}
