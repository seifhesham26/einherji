import { buildRequestHeaders, type RequestHeaderOptions } from "./build-request-headers";
import { sleep } from "./rate-limiter";
import { CircuitOpenError, ScrapeError } from "./scrape-error";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const RETRY_JITTER_MS = 1_000;
// After this many consecutive 429s from one host we stop asking. A host that has
// rate-limited us three times in a row is not going to relent within a run.
const CIRCUIT_BREAK_THRESHOLD = 3;

const consecutiveRateLimitsByHost = new Map<string, number>();

export interface FetchWithRetryOptions extends RequestHeaderOptions {
  signal?: AbortSignal;
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const host = new URL(url).host;

  if ((consecutiveRateLimitsByHost.get(host) ?? 0) >= CIRCUIT_BREAK_THRESHOLD) {
    throw new CircuitOpenError(host);
  }

  let lastStatus = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (options.signal?.aborted) throw new ScrapeError("Scrape cancelled", 0, url);

    const response = await fetch(url, {
      method: "GET",
      headers: buildRequestHeaders(options),
      signal: options.signal,
      redirect: "follow",
    });

    if (response.ok) {
      consecutiveRateLimitsByHost.set(host, 0);
      return response;
    }

    lastStatus = response.status;

    // 403 is included deliberately: several job boards (Himalayas among them)
    // soft-rate-limit with 403 rather than 429, and the request succeeds on retry.
    // A genuinely forbidden endpoint just costs us two wasted attempts.
    if (response.status === 429 || response.status === 403) {
      const failures = (consecutiveRateLimitsByHost.get(host) ?? 0) + 1;
      consecutiveRateLimitsByHost.set(host, failures);
      if (failures >= CIRCUIT_BREAK_THRESHOLD) throw new CircuitOpenError(host);

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
    throw new ScrapeError(`Request to ${url} failed with ${response.status}`, response.status, url);
  }

  throw new ScrapeError(
    `Request to ${url} failed after ${MAX_ATTEMPTS} attempts`,
    lastStatus,
    url,
  );
}

export async function fetchJson<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<T> {
  const response = await fetchWithRetry(url, { ...options, accept: "application/json" });
  return response.json() as Promise<T>;
}

export async function fetchText(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return response.text();
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
  consecutiveRateLimitsByHost.clear();
}
