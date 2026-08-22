// Several sources authenticate through the query string rather than a header —
// Adzuna puts `app_id` and `app_key` straight in the URL. Scrape errors embed the
// URL they failed on, and those messages are persisted to `scrape_runs.errorMessage`
// and rendered in the UI, so anything that reaches a message has to be scrubbed
// first. A leaked key here is a key leaked to every viewer of the run history.
const SENSITIVE_PARAM_PATTERN =
  /app_id|api_?key|app_?key|access_?token|refresh_?token|client_?secret|(^|_)(key|token|secret|password|signature|credential)s?($|_)/i;

const REDACTED_VALUE = "REDACTED";

export function redactUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not a URL we can take apart — drop the query string wholesale rather than
    // risk passing a secret through.
    return url.split("?")[0];
  }

  for (const name of [...parsed.searchParams.keys()]) {
    if (SENSITIVE_PARAM_PATTERN.test(name)) parsed.searchParams.set(name, REDACTED_VALUE);
  }

  // Credentials can also ride in the userinfo section (https://user:pass@host).
  if (parsed.username || parsed.password) {
    parsed.username = REDACTED_VALUE;
    parsed.password = "";
  }

  return parsed.toString();
}
