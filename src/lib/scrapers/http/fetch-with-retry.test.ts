import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry, resetCircuitBreakers } from "./fetch-with-retry";
import { CircuitOpenError, ScrapeError } from "./scrape-error";

// retry-after: 0 keeps the backoff sleeps instant, so these run on real timers.
function rateLimitedResponse() {
  return new Response("slow down", { status: 429, headers: { "retry-after": "0" } });
}

// Attaches the rejection handler synchronously — awaiting later would leave the
// rejection unhandled for a tick.
function settle<T>(promise: Promise<T>): Promise<T | unknown> {
  return promise.catch((error: unknown) => error);
}

describe("fetchWithRetry circuit breaker", () => {
  beforeEach(() => resetCircuitBreakers());
  afterEach(() => vi.unstubAllGlobals());

  // Regression: the breaker used to have no cooldown. Once a host tripped it, the
  // guard threw *before* reaching fetch — and the only thing that reset the count
  // was a successful response. So the host could never be retried again for the
  // life of the process. Himalayas soft-limits with 403 routinely, which made this
  // a matter of when, not if.
  it("reopens after the cooldown instead of blocking a host for the process lifetime", async () => {
    const fetchMock = vi.fn(async () => rateLimitedResponse());
    vi.stubGlobal("fetch", fetchMock);

    expect(await settle(fetchWithRetry("https://example.test/a"))).toBeInstanceOf(
      CircuitOpenError,
    );

    // Still inside the cooldown: rejected without spending a request.
    const callsAfterTrip = fetchMock.mock.calls.length;
    expect(await settle(fetchWithRetry("https://example.test/b"))).toBeInstanceOf(
      CircuitOpenError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(callsAfterTrip);

    // Once the cooldown lapses the host gets another chance. The success path has
    // no sleeps, so a frozen clock is enough to move past the window.
    try {
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 6 * 60_000);

      fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
      await expect(fetchWithRetry("https://example.test/c")).resolves.toBeInstanceOf(Response);
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterTrip);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps hosts isolated so one blocked board does not stop the others", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("blocked.test") ? rateLimitedResponse() : new Response("{}", { status: 200 }),
      ),
    );

    expect(await settle(fetchWithRetry("https://blocked.test/jobs"))).toBeInstanceOf(
      CircuitOpenError,
    );
    await expect(fetchWithRetry("https://healthy.test/jobs")).resolves.toBeInstanceOf(Response);
  });

  it("gives up on a 404 without retrying — a missing board will not appear", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await settle(fetchWithRetry("https://example.test/missing"))).toBeInstanceOf(
      ScrapeError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // A hostile or misconfigured host could otherwise stream until the process dies.
  it("refuses a response larger than the size cap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("x".repeat(64), {
            status: 200,
            headers: { "content-length": String(50 * 1024 * 1024) },
          }),
      ),
    );

    await expect(fetchWithRetry("https://huge.test/feed")).rejects.toThrow(/too large/i);
  });
});

describe("fetchWithRetry SSRF guard", () => {
  beforeEach(() => resetCircuitBreakers());
  afterEach(() => vi.unstubAllGlobals());

  it("does not connect at all when the target is a private address", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchWithRetry("http://169.254.169.254/latest/meta-data/", { requireSafeUrl: true }),
    ).rejects.toThrow(/link-local/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Validating only the URL the user typed is not enough: the host controls where
  // it redirects to.
  it("re-checks every redirect hop", async () => {
    // example.com is a real, publicly-resolving host, so the first hop passes the
    // guard exactly as an attacker's own domain would.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("example.com")
          ? new Response(null, {
              status: 302,
              headers: { location: "http://127.0.0.1/admin" },
            })
          : new Response("should never be reached", { status: 200 }),
      ),
    );

    await expect(
      fetchWithRetry("http://example.com/jobs", { requireSafeUrl: true }),
    ).rejects.toThrow(/loopback/i);
  });

  it("still fetches ordinary public URLs", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html></html>", { status: 200 })));

    await expect(
      fetchWithRetry("https://example.com/careers", { requireSafeUrl: true }),
    ).resolves.toBeInstanceOf(Response);
  });
});
