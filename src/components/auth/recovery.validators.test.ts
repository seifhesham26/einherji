import { describe, expect, it } from "vitest";
import { requestRecoverySchema, resetPasswordSchema } from "./recovery.validators";

describe("recovery input", () => {
  it("trims a valid email", () => {
    expect(requestRecoverySchema.parse({ email: " user@unit.invalid " }).email).toBe("user@unit.invalid");
  });
  it.each(["", "not-an-email", "a".repeat(255) + "@unit.invalid"])("rejects invalid email %s", (email) => {
    expect(requestRecoverySchema.safeParse({ email }).success).toBe(false);
  });
  it.each(["", "short", "x".repeat(129)])("rejects invalid password length", (password) => {
    expect(resetPasswordSchema.safeParse({ password, confirmPassword: password }).success).toBe(false);
  });
  it("requires matching confirmation", () => {
    expect(resetPasswordSchema.safeParse({ password: "abcdefgh", confirmPassword: "different" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "abcdefgh", confirmPassword: "abcdefgh" }).success).toBe(true);
  });
});
