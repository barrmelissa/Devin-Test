import { execSync } from "node:child_process";

// Fresh, isolated SQLite database for the test run (prisma/test.db).
export default function setup() {
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
