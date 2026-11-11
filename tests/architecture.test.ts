import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Architecture rule: apps never touch the database or external systems directly.
// (Also enforced by the no-restricted-imports rule in eslint.config.mjs.)
const APPS_DIR = path.resolve(__dirname, "../src/apps");
const FORBIDDEN = [
  /from\s+["']@prisma\/client["']/,
  /from\s+["'][^"']*foundation\/db["']/,
  /from\s+["'][^"']*foundation\/audit\/(writer|query)["']/,
  /from\s+["'][^"']*foundation\/integrations\/mocks\//,
  /\bfetch\s*\(/,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });
}

describe("architecture", () => {
  it("apps only reach data and external systems through the foundation", () => {
    const violations = files(APPS_DIR).flatMap((f) => {
      const src = readFileSync(f, "utf8");
      return FORBIDDEN.filter((re) => re.test(src)).map((re) => `${path.relative(APPS_DIR, f)} matches ${re}`);
    });
    expect(violations).toEqual([]);
  });
});
