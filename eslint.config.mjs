import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Architecture rule: apps go through the foundation, never the database or external systems directly.
    files: ["src/apps/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@prisma/client", "@prisma/*"], message: "Apps must use foundation data helpers (@/foundation/data), not Prisma." },
            { group: ["@/foundation/db", "@/foundation/db/*", "**/foundation/db"], message: "The db client is foundation-internal. Use @/foundation/data." },
            { group: ["@/foundation/audit/writer", "@/foundation/audit/query", "**/audit/writer", "**/audit/query"], message: "Audit entries are written by the foundation data helpers automatically; read history via getRecordHistory()." },
            { group: ["@/foundation/integrations/mocks/*"], message: "Use getAdapters() from @/foundation/integrations." },
            { group: ["@/foundation/crypto", "**/foundation/crypto"], message: "Field encryption is handled by the foundation data helpers; list the field in policy.sensitiveFields." },
          ],
        },
      ],
    },
  },
];
