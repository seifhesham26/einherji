import { describe, expect, it } from "vitest";
import { assertSafeUrl, UnsafeUrlError } from "./assert-safe-url";

// The careers URL on a tracked company is typed in by the user and then fetched
// server-side, which is the whole reason this guard exists.
describe("assertSafeUrl", () => {
  it.each([
    ["cloud metadata", "http://169.254.169.254/latest/meta-data/iam/security-credentials/"],
    ["loopback", "http://127.0.0.1/admin"],
    ["loopback by another name", "http://127.1/admin"],
    ["private class A", "http://10.0.0.5/"],
    ["private class B", "http://172.16.4.1/"],
    ["private class C", "http://192.168.1.1/"],
    ["carrier-grade NAT", "http://100.64.0.1/"],
    ["IPv6 loopback", "http://[::1]/"],
    ["IPv6 unique local", "http://[fd00::1]/"],
    ["IPv6 link-local", "http://[fe80::1]/"],
    // new URL() rewrites this as [::ffff:7f00:1], so a text match on the dotted
    // quad would let loopback through.
    ["IPv4-mapped IPv6", "http://[::ffff:127.0.0.1]/"],
    ["IPv4-mapped IPv6 in hex form", "http://[::ffff:a00:1]/"],
    ["IPv4-compatible IPv6", "http://[::169.254.169.254]/"],
    ["IPv6 unspecified", "http://[::]/"],
  ])("rejects %s", async (_label, url) => {
    await expect(assertSafeUrl(url)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it.each([
    ["file", "file:///etc/passwd"],
    ["javascript", "javascript:alert(1)"],
    ["gopher", "gopher://internal:70/x"],
    ["data", "data:text/html,<script>alert(1)</script>"],
  ])("rejects the %s scheme", async (_label, url) => {
    await expect(assertSafeUrl(url)).rejects.toThrow(/unsupported scheme/i);
  });

  // http://expected.com@10.0.0.1/ points at 10.0.0.1, not expected.com — a
  // reviewer skimming the string reads it the other way round.
  it("rejects URLs carrying embedded credentials", async () => {
    await expect(assertSafeUrl("http://jobs.example.com@10.0.0.1/")).rejects.toThrow(
      /credentials/i,
    );
  });

  it("rejects a hostname that does not resolve", async () => {
    await expect(
      assertSafeUrl("http://this-host-should-not-exist.invalid/"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects a public hostname that resolves to a private address", async () => {
    // localhost is the portable case of exactly that shape.
    await expect(assertSafeUrl("http://localhost:5432/")).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("allows an ordinary public job board", async () => {
    await expect(assertSafeUrl("https://boards.greenhouse.io/stripe")).resolves.toBeInstanceOf(
      URL,
    );
  });

  // 8.8.8.8 is deliberately public and needs no DNS round trip.
  it("allows a public literal IP without resolving it", async () => {
    await expect(assertSafeUrl("http://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});
