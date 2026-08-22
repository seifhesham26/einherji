import { afterEach, describe, expect, it, vi } from "vitest";
import { resetCircuitBreakers } from "../http/fetch-with-retry";
import type { JobSearchQuery } from "../job-source.types";
import { SourceNotApplicableError } from "../source-not-applicable-error";
import { fetchAdzunaJobs } from "./adzuna";

const credentials = { appId: "app-id", apiKey: "api-key" };

function buildQuery(overrides: Partial<JobSearchQuery> = {}): JobSearchQuery {
  return { titles: ["engineer"], locations: ["London"], ...overrides };
}

function resultsResponse(titles: string[]) {
  return new Response(
    JSON.stringify({
      results: titles.map((title, index) => ({
        id: `job-${title}-${index}`,
        title,
        redirect_url: "https://www.adzuna.co.uk/details/1",
        company: { display_name: "Acme" },
        location: { display_name: "London" },
      })),
    }),
    { status: 200 },
  );
}

describe("fetchAdzunaJobs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetCircuitBreakers();
  });

  // The retry layer backs off for seconds between attempts. Fake timers let the
  // 5xx paths below exercise all three attempts without the test sleeping.
  async function settleThroughRetries<T>(promise: Promise<T>): Promise<T> {
    // The outcome handler has to be attached synchronously — the rejection lands
    // while the timers below are advancing, and would otherwise go unhandled.
    const outcome = promise.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );

    await vi.runAllTimersAsync();

    const settled = await outcome;
    if ("error" in settled) throw settled.error;
    return settled.value;
  }

  // Regression: Adzuna resolves `where` inside the country in the URL path, so an
  // uncovered location silently fell back to the UK index and searched it for
  // "Cairo" — guaranteed zero results, reported as a healthy empty source.
  it("refuses a location Adzuna has no index for instead of searching the wrong country", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const error = await fetchAdzunaJobs(
      credentials,
      buildQuery({ locations: ["Cairo"] }),
    ).catch((caught: unknown) => caught);

    // Not a plain Error: the run summary reports this as a skip, not a failure.
    expect(error).toBeInstanceOf(SourceNotApplicableError);
    expect((error as SourceNotApplicableError).reason).toMatch(/no index covering Cairo/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only the location that selected the country as `where`", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return resultsResponse(["engineer"]);
      }),
    );

    await fetchAdzunaJobs(credentials, buildQuery({ locations: ["Remote", "Berlin"] }));

    const [requestedUrl] = requestedUrls;
    expect(requestedUrl).toContain("/jobs/de/search/1");
    expect(requestedUrl).toContain("where=Berlin");
  });

  // Regression: the per-title loop had no error handling, so one keyword hitting
  // Adzuna's intermittent 5xx discarded every job the earlier keywords returned.
  it("keeps the jobs earlier titles returned when one title fails", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("what=broken")
        ? new Response("upstream is down", { status: 500 })
        : resultsResponse(["engineer"]),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    const jobs = await settleThroughRetries(
      fetchAdzunaJobs(credentials, buildQuery({ titles: ["engineer", "broken"] })),
    );

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe("engineer");
  });

  it("still reports the failure when every title failed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream is down", { status: 500 })));
    vi.useFakeTimers();

    await expect(
      settleThroughRetries(fetchAdzunaJobs(credentials, buildQuery())),
    ).rejects.toThrow(/failed after 3 attempts \(last status 500\)/i);
  });

  // The message goes to scrape_runs.errorMessage and the run history in the UI.
  it("does not leak the API key into the failure message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream is down", { status: 500 })));
    vi.useFakeTimers();

    await expect(
      settleThroughRetries(fetchAdzunaJobs(credentials, buildQuery())),
    ).rejects.toThrow(expect.objectContaining({ message: expect.not.stringContaining("api-key") }));
  });
});
