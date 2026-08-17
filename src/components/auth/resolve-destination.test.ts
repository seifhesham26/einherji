import { describe, expect, it } from "vitest";
import { resolveDestination } from "./resolve-destination";

// `next` comes from the query string, so it is attacker-controlled. Anything that
// router.push would treat as an absolute destination turns the login page into an
// open redirect — a credible phishing step, because the victim really did just
// sign in to the genuine site.
describe("resolveDestination", () => {
  it.each([
    ["a protocol-relative URL", "//evil.example"],
    ["an absolute http URL", "http://evil.example/steal"],
    ["an absolute https URL", "https://evil.example/steal"],
    ["a scheme-only target", "javascript:alert(1)"],
    ["a bare hostname", "evil.example"],
    ["a backslash trick", "\\\\evil.example"],
    ["nothing at all", null],
    ["an empty string", ""],
  ])("falls back to the dashboard for %s", (_label, next) => {
    expect(resolveDestination(next)).toBe("/dashboard");
  });

  it.each([
    ["/jobs"],
    ["/settings"],
    ["/companies"],
    ["/leads?status=interview"],
  ])("keeps the relative path %s", (next) => {
    expect(resolveDestination(next)).toBe(next);
  });
});
