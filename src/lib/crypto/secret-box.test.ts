import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  decryptSecret,
  encryptSecret,
  EncryptionKeyError,
  isEncrypted,
  resetEncryptionKeyCache,
} from "./secret-box";

const TEST_KEY = randomBytes(32).toString("base64");

describe("secret-box", () => {
  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = TEST_KEY;
    resetEncryptionKeyCache();
  });

  afterEach(() => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    resetEncryptionKeyCache();
  });

  it("round-trips a secret", () => {
    const token = "apify_api_9f2b7c1d4e6a8b0c";
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it("does not leave the plaintext visible in the stored value", () => {
    const token = "apify_api_9f2b7c1d4e6a8b0c";
    const stored = encryptSecret(token);

    expect(stored).not.toContain(token);
    expect(isEncrypted(stored)).toBe(true);
  });

  // A deterministic ciphertext would let anyone with database access tell which
  // users share a key, and confirm a guessed value by encrypting it themselves.
  it("produces a different ciphertext each time for the same input", () => {
    const first = encryptSecret("same-value");
    const second = encryptSecret("same-value");

    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe(decryptSecret(second));
  });

  it("handles unicode and long values", () => {
    const value = `${"k".repeat(4096)}—✓`;
    expect(decryptSecret(encryptSecret(value))).toBe(value);
  });

  // GCM authenticates as well as encrypts. Without that check a tampered value
  // could decrypt to garbage that then gets sent to a third-party API.
  it("refuses a tampered ciphertext instead of returning garbage", () => {
    const stored = encryptSecret("apify_api_secret");
    const parts = stored.split(".");
    const corrupted = Buffer.from(parts[3], "base64");
    corrupted[0] ^= 0xff;
    parts[3] = corrupted.toString("base64");

    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("refuses a value encrypted under a different key", () => {
    const stored = encryptSecret("apify_api_secret");

    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    resetEncryptionKeyCache();

    expect(() => decryptSecret(stored)).toThrow();
  });

  // Rows written before encryption existed are plaintext. Throwing on them would
  // lock users out of keys they already saved.
  it("passes through a legacy plaintext value unchanged", () => {
    expect(decryptSecret("apify_api_written_before_encryption")).toBe(
      "apify_api_written_before_encryption",
    );
    expect(isEncrypted("apify_api_written_before_encryption")).toBe(false);
  });

  it("fails loudly when no key is configured", () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    resetEncryptionKeyCache();

    expect(() => encryptSecret("x")).toThrow(EncryptionKeyError);
  });

  it("rejects a key that is not 32 bytes", () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(16).toString("base64");
    resetEncryptionKeyCache();

    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
  });
});
