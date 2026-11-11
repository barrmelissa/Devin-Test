import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    // Fixed, test-only key (not a secret).
    env: { DATABASE_URL: "file:./test.db", FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") },
    fileParallelism: false,
  },
});
