export const DEFAULT_DESTINATION = "/dashboard";

/**
 * Where to send the user after signing in.
 *
 * The proxy adds `?next=` when it bounces someone away from a page they asked
 * for. It's a query parameter, so anyone can set it — "//evil.com" and
 * "https://evil.com" are both valid `router.push` targets and would turn the
 * login page into an open redirect. Only a single-slash relative path is allowed.
 */
export function resolveDestination(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return DEFAULT_DESTINATION;
  return next;
}
