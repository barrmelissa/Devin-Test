import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}

// Generate a local field-encryption key if one isn't set. Production would use a KMS-managed key.
const env = readFileSync(".env", "utf8");
const current = env.match(/^FIELD_ENCRYPTION_KEY="?([^"\n]*)"?$/m);
if (!current || !current[1]) {
  const line = `FIELD_ENCRYPTION_KEY="${randomBytes(32).toString("base64")}"`;
  const next = current ? env.replace(current[0], line) : `${env.trimEnd()}\n\n${line}\n`;
  writeFileSync(".env", next);
  console.log("Generated FIELD_ENCRYPTION_KEY in .env");
}
