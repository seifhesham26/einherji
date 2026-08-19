import { describe, expect, it } from "vitest";
import { isHttpUrl } from "./is-http-url";

describe("isHttpUrl", () => {
  it.each([
    "https://linkedin.com/in/someone",
    "http://example.com",
    "https://example.com/path?query=1#hash",
  ])("accepts %s", (url) => expect(isHttpUrl(url)).toBe(true));

  // A javascript: href on a link the user clicks is stored XSS, not a typo.
  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
    "not a url at all",
    "",
    "//evil.example",
  ])("rejects %s", (url) => expect(isHttpUrl(url)).toBe(false));
});
