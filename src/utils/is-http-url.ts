/**
 * True only for a well-formed http(s) URL.
 *
 * Zod's `.url()` checks that the string *parses*, which "javascript:alert(1)"
 * and "file:///etc/passwd" both do. That matters in two different ways here:
 * a URL rendered into an `href` becomes stored XSS, and a URL fetched on the
 * server becomes SSRF. Every user-supplied URL in this app goes through here
 * first; server-side fetches additionally go through assert-safe-url.ts, which
 * checks the address rather than just the scheme.
 */
export function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

export const HTTP_URL_MESSAGE = "Must start with http:// or https://";
