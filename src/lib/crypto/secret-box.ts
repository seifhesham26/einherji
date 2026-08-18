import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for secrets held at rest.
 *
 * Third-party API keys (Apify, Adzuna, Reddit, X, SerpAPI) sit in the database
 * in plaintext today, so anyone who reaches a backup, a read replica, or the
 * Neon console reads every user's keys and can spend against them. Hashing is
 * not an option here — the scraper has to send the real value upstream — so this
 * is symmetric encryption with the key held outside the database.
 *
 * AES-256-GCM rather than CBC: it authenticates as well as encrypts, so a
 * tampered ciphertext fails loudly instead of decrypting to garbage that then
 * gets sent to a third-party API.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits, the size GCM is specified for.
const VERSION = "v1";
const SEPARATOR = ".";

export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionKeyError";
  }
}

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const rawKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new EncryptionKeyError(
      "CREDENTIALS_ENCRYPTION_KEY is not set, so saved API keys cannot be encrypted or read. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }

  const key = Buffer.from(rawKey, "base64");
  if (key.length !== KEY_BYTES) {
    throw new EncryptionKeyError(
      `CREDENTIALS_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. It should be base64 of 32 random bytes.`,
    );
  }

  cachedKey = key;
  return key;
}

/** True for a value this module produced. Anything else is legacy plaintext. */
export function isEncrypted(value: string): boolean {
  return value.startsWith(`${VERSION}${SEPARATOR}`);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, loadKey(), iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Versioned so the scheme can change later without guessing at old rows.
  return [
    VERSION,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(SEPARATOR);
}

/**
 * Reverses encryptSecret.
 *
 * A value written before encryption existed is returned unchanged rather than
 * throwing — the rows already in the database are plaintext, and failing on them
 * would lock users out of their own saved keys. Re-saving upgrades a row.
 */
export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) return stored;

  const [, ivPart, tagPart, ciphertextPart] = stored.split(SEPARATOR);
  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Stored secret is malformed and cannot be decrypted.");
  }

  const decipher = createDecipheriv(ALGORITHM, loadKey(), Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Null-tolerant wrappers — every secret column in the schema is nullable. */
export function encryptOptionalSecret(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return encryptSecret(value);
}

export function decryptOptionalSecret(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return decryptSecret(value);
}

// Test-only: the key is cached on first use, so a test changing the env var
// would otherwise keep using the old one.
export function resetEncryptionKeyCache(): void {
  cachedKey = null;
}
