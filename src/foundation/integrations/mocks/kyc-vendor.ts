import type { KycVendorAdapter } from "../types";

const SANCTIONED_COUNTRIES = new Set(["RU", "IR", "KP", "SY", "CU", "BY"]);

/** Deterministic mock: sanctioned country -> fail, high risk -> review, otherwise pass. */
export class MockKycVendorAdapter implements KycVendorAdapter {
  async runCheck(input: Parameters<KycVendorAdapter["runCheck"]>[0]) {
    const checkedAt = new Date();
    if (SANCTIONED_COUNTRIES.has(input.country.toUpperCase())) {
      return { result: "fail" as const, reason: `Sanctions list match (country: ${input.country})`, checkedAt };
    }
    if (input.riskScore >= 70) {
      return { result: "review" as const, reason: `High risk score (${input.riskScore}); manual review required`, checkedAt };
    }
    return { result: "pass" as const, reason: "No sanctions or PEP matches; ID verified", checkedAt };
  }
}
