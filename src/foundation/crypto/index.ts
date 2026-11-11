import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Foundation-internal field encryption (AES-256-GCM). The data helpers encrypt every policy
// `sensitiveFields` value before it is written and decrypt it after it is read, so apps never
// see ciphertext or the key. In production the key would come from a KMS / secrets manager.
const PREFIX = "enc:v1:";

function key(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set. Run `npm run setup` to generate one in .env.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  return k;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

export function decryptField(stored: string): string {
  if (!isEncrypted(stored)) {
    throw new Error("Found an unencrypted sensitive value in the database. Run `npm run db:reset` to reseed.");
  }
  const [iv, tag, ct] = stored.slice(PREFIX.length).split(":").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
