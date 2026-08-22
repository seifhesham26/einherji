import { assertSafeUrl } from "./assert-safe-url";
import { buildRequestHeaders, type RequestHeaderOptions } from "./build-request-headers";
import { redactUrl } from "./redact-url";
import { sleep } from "./rate-limiter";
import { CircuitOpenError, ScrapeError } from "./scrape-error";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const RETRY_JITTER_MS = 1_000;
// After this many consecutive 429s from one host we stop asking. A host that has
// rate-limited us three times in a row is not going to relent within a run.
const CIRCUIT_BREAK_THRESHOLD = 3;
// ...but it will relent eventually, so the breaker has to reopen on its own.
// Without this the guard below throws before reaching the fetch that would reset
// the counter, and the host stays blocked for the lifetime of the process.
const CIRCUIT_COOLDOWN_MS = 5 * 60_000;
// Job feeds are a few megabytes at most. Anything beyond this is a runaway
// response, and reading it to completion is how a single bad host kills the node.
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
// A public URL that redirects to 169.254.169.254 is the standard way past a
// validate-once SSRF guard, so guarded fetches walk redirects by hand.
const MAX_REDIRECTS = 5;

interface BreakerState {
  failures: number;
  openedAt: number;
}

const breakerStateByHost = new Map<string, BreakerState>();

export interface FetchWithRetryOptions extends RequestHeaderOptions {
  signal?: AbortSignal;
  // Set for URLs that came from a user. Validates the target — and every redirect
  // hop — against the private address ranges before connecting.
  requireSafeUrl?: boolean;
}

function isCircuitOpen(host: string): boolean {
  const state = breakerStateByHost.get(host);
  if (!state || state.failures < CIRCUIT_BREAK_THRESHOLD) return false;

  if (Date.now() - state.openedAt >= CIRCUIT_COOLDOWN_MS) {
    // Half-open: clear the count and let the next request decide.
    breakerStateByHost.delete(host);
    return false;
  }
  return true;
}

function recordRateLimit(host: string): number {
  const failures = (breakerStateByHost.get(host)?.failures ?? 0) + 1;
  breakerStateByHost.set(host, { failures, openedAt: Date.now() });
  return failures;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  if (options.requireSafeUrl) await assertSafeUrl(url);

  const host = new URL(url).host;
  if (isCircuitOpen(host)) throw new CircuitOpenError(host);

  let lastStatus = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (options.signal?.aborted) throw new ScrapeError("Scrape cancelled", 0, redactUrl(url));

    const response = options.requireSafeUrl
      ? await fetchFollowingSafeRedirects(url, options)
      : await fetch(url, {
          method: "GET",
          headers: buildRequestHeaders(options),
          signal: options.signal,
          redirect: "follow",
        });

    if (response.ok) {
      breakerStateByHost.delete(host);
      assertWithinSizeLimit(response, url);
      return response;
    }

    lastStatus = response.status;

    // 403 is included deliberately: several job boards (Himalayas among them)
    // soft-rate-limit with 403 rather than 429, and the request succeeds on retry.
    // A genuinely forbidden endpoint just costs us two wasted attempts.
    if (response.status === 429 || response.status === 403) {
      if (recordRateLimit(host) >= CIRCUIT_BREAK_THRESHOLD) throw new CircuitOpenError(host);

      // Prefer the server's own instruction over our guess.
      await sleep(readRetryAfterMs(response) ?? backoffFor(attempt));
      continue;
    }

    if (response.status >= 500) {
      await sleep(backoffFor(attempt));
      continue;
    }

    // 4xx other than 429 won't improve on retry — a 404 from an ATS board just
    // means the company isn't there.
    throw new ScrapeError(
      `Request to ${redactUrl(url)} failed with ${response.status}`,
      response.status,
      redactUrl(url),
    );
  }

  // The status is the whole diagnosis here — "failed after 3 attempts" alone
  // can't tell an upstream outage apart from us being throttled.
  throw new ScrapeError(
    `Request to ${redactUrl(url)} failed after ${MAX_ATTEMPTS} attempts (last status ${lastStatus})`,
    lastStatus,
    redactUrl(url),
  );
}

// Walks redirects manually so each hop can be re-validated. `redirect: "follow"`
// would resolve the chain inside undici, where the guard can't see it.
async function fetchFollowingSafeRedirects(
  url: string,
  options: FetchWithRetryOptions,
): Promise<Response> {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(currentUrl, {
      method: "GET",
      headers: buildRequestHeaders(options),
      signal: options.signal,
      redirect: "manual",
    });

    const location = response.headers.get("location");
    const isRedirect = response.status >= 300 && response.status < 400 && location;
    if (!isRedirect) return response;

    currentUrl = new URL(location, currentUrl).toString();
    await assertSafeUrl(currentUrl);
  }

  throw new ScrapeError(`Too many redirects from ${redactUrl(url)}`, 0, redactUrl(url));
}

// Checked from the declared length where there is one. Bodies without a
// Content-Length are capped while streaming in readCappedText.
function assertWithinSizeLimit(response: Response, url: string): void {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new ScrapeError(
      `Response from ${redactUrl(url)} is too large (${declaredLength} bytes)`,
      response.status,
      redactUrl(url),
    );
  }
}

async function readCappedText(response: Response, url: string): Promise<string> {
  if (!response.body) return response.text();

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let received = 0;
  let text = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        throw new ScrapeError(`Response from ${redactUrl(url)} is too large`, response.status, redactUrl(url));
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    // Releases the socket even when we bail out early on an oversized body.
    await reader.cancel().catch(() => undefined);
  }

  return text + decoder.decode();
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<T> {
  const response = await fetchWithRetry(url, { ...options, accept: "application/json" });
  return JSON.parse(await readCappedText(response, url)) as T;
}

export async function fetchText(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return readCappedText(response, url);
}

function backoffFor(attempt: number): number {
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
  // Jitter stops parallel runs from retrying in lockstep.
  return exponential + Math.random() * RETRY_JITTER_MS;
}

function readRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1_000, MAX_BACKOFF_MS);

  const retryDate = Date.parse(header);
  if (Number.isNaN(retryDate)) return null;
  return Math.min(Math.max(retryDate - Date.now(), 0), MAX_BACKOFF_MS);
}

// Exposed for tests — the breaker state is module-level and would otherwise leak
// between cases.
export function resetCircuitBreakers(): void {
  breakerStateByHost.clear();
}
