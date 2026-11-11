import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}

// Generate local secrets that aren't set. Production would load these from a KMS / secrets manager.
const GENERATED = {
  FIELD_ENCRYPTION_KEY: () => randomBytes(32).toString("base64"),
  ONBOARDING_SERVICE_TOKEN: () => randomBytes(32).toString("hex"),
};

let env = readFileSync(".env", "utf8");
for (const [name, make] of Object.entries(GENERATED)) {
  const current = env.match(new RegExp(`^${name}="?([^"\\n]*)"?$`, "m"));
  if (current && current[1]) continue;
  const line = `${name}="${make()}"`;
  env = current ? env.replace(current[0], line) : `${env.trimEnd()}\n\n${line}\n`;
  console.log(`Generated ${name} in .env`);
}
writeFileSync(".env", env);
