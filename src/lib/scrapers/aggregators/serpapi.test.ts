import { afterEach, describe, expect, it, vi } from "vitest";
import { resetCircuitBreakers } from "../http/fetch-with-retry";
import type { JobSearchQuery } from "../job-source.types";
import { fetchSerpApiJobs, planSearchScopes } from "./serpapi";

const credentials = { apiKey: "serpapi-secret-key" };

function buildQuery(overrides: Partial<JobSearchQuery> = {}): JobSearchQuery {
  return { titles: ["software engineer"], locations: ["Cairo, Egypt"], ...overrides };
}

function jobsResponse(jobs: unknown[]) {
  return new Response(JSON.stringify({ jobs_results: jobs }), { status: 200 });
}

const CAIRO_JOB = {
  title: "Software Engineer",
  company_name: "Acme Egypt",
  location: "Cairo, Egypt",
  description: "Build things.",
  job_id: "google-job-token-1",
  via: "via Wuzzuf",
  detected_extensions: { posted_at: "3 days ago", schedule_type: "Full-time" },
  apply_options: [{ title: "Wuzzuf", link: "https://wuzzuf.net/jobs/p/abc-software-engineer" }],
};

describe("planSearchScopes", () => {
  it("turns a Remote+Cairo bucket into a location search and a work-from-home search", () => {
    expect(planSearchScopes(["Remote", "Cairo", "Egypt"])).toEqual([
      { location: "Cairo" },
      { remote: true },
    ]);
  });

  it("costs one search when the bucket names only a place", () => {
    expect(planSearchScopes(["Cairo, Egypt"])).toEqual([{ location: "Cairo, Egypt" }]);
  });

  it("costs one search when the bucket is remote-only", () => {
    expect(planSearchScopes(["Remote"])).toEqual([{ remote: true }]);
  });

  // Without a scope Google falls back to the datacentre's own location, which is
  // never what the user meant.
  it("still searches once when the bucket names no location at all", () => {
    expect(planSearchScopes([])).toEqual([{}]);
  });
});

describe("fetchSerpApiJobs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetCircuitBreakers();
  });

  it("maps a Google Jobs result onto a scraped job", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jobsResponse([CAIRO_JOB])));

    const [job] = await fetchSerpApiJobs(credentials, buildQuery());

    expect(job.title).toBe("Software Engineer");
    expect(job.company).toBe("Acme Egypt");
    expect(job.location).toBe("Cairo, Egypt");
    expect(job.jobUrl).toBe("https://wuzzuf.net/jobs/p/abc-software-engineer");
    expect(job.workType).toBe("full_time");
    // "via Wuzzuf" is how a Cairo user can see the Egyptian boards are reached.
    expect(job.tags).toEqual(["Wuzzuf"]);
  });

  // Regression: "3 days ago" through z.coerce.date() is an Invalid Date, which
  // fails the schema and drops the whole listing rather than just the date.
  it("keeps a listing whose posted date is a relative age", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jobsResponse([CAIRO_JOB])));

    const [job] = await fetchSerpApiJobs(credentials, buildQuery());

    expect(job.postedAt).toBeInstanceOf(Date);
    expect(Number.isNaN(job.postedAt!.getTime())).toBe(false);
  });

  it("searches the location the query asked for", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return jobsResponse([CAIRO_JOB]);
      }),
    );

    await fetchSerpApiJobs(credentials, buildQuery());

    expect(requestedUrls[0]).toContain("engine=google_jobs");
    expect(requestedUrls[0]).toContain("location=Cairo%2C+Egypt");
  });

  // Every request is metered — the free tier is 100 searches a month — so the
  // request count has to stay predictable: keywords x scopes, nothing hidden.
  it("spends one search per keyword when the bucket names one scope", async () => {
    const fetchMock = vi.fn(async () => jobsResponse([CAIRO_JOB]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchSerpApiJobs(credentials, buildQuery({ titles: ["engineer", "developer"] }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // A bucket listing "Remote" alongside "Cairo" is asking two different questions:
  // a location search returns jobs *in* Cairo and never surfaces work-from-home
  // listings, which sit behind Google's own ltype filter.
  it("searches both the named place and work-from-home when the bucket asks for both", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        requestedUrls.push(url);
        return jobsResponse([CAIRO_JOB]);
      }),
    );

    await fetchSerpApiJobs(
      credentials,
      buildQuery({ titles: ["engineer"], locations: ["Remote", "Cairo", "Egypt"] }),
    );

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls.some((url) => url.includes("location=Cairo"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("ltype=1"))).toBe(true);
  });

  // The bucket decides where results come from, so both kinds have to survive
  // the shared location filter rather than one crowding out the other.
  it("keeps both a Cairo job and a worldwide-remote job for a Remote+Cairo bucket", async () => {
    const remoteJob = {
      ...CAIRO_JOB,
      job_id: "google-job-token-2",
      title: "Remote React Developer",
      location: "Anywhere",
      detected_extensions: { posted_at: "1 day ago", work_from_home: true },
      apply_options: [{ title: "Careers", link: "https://example.test/remote-react" }],
    };
    vi.stubGlobal("fetch", vi.fn(async () => jobsResponse([CAIRO_JOB, remoteJob])));

    const jobs = await fetchSerpApiJobs(
      credentials,
      buildQuery({ titles: ["engineer"], locations: ["Remote", "Cairo", "Egypt"] }),
    );

    expect(jobs.map((job) => job.title)).toContain("Software Engineer");
    expect(jobs.map((job) => job.title)).toContain("Remote React Developer");
  });

  // SerpAPI answers 200 with an `error` string, so the status never reveals this.
  it("surfaces a bad key rather than reporting an empty board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Invalid API key" }), { status: 200 })),
    );

    await expect(fetchSerpApiJobs(credentials, buildQuery())).rejects.toThrow(/Invalid API key/);
  });

  it("treats 'no results' as an empty page, not a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "Google hasn't returned any results for this query." }),
            { status: 200 },
          ),
      ),
    );

    await expect(fetchSerpApiJobs(credentials, buildQuery())).resolves.toEqual([]);
  });

  it("drops a listing with no link, since nothing downstream can use it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jobsResponse([{ ...CAIRO_JOB, apply_options: null, share_link: null }])),
    );

    await expect(fetchSerpApiJobs(credentials, buildQuery())).resolves.toEqual([]);
  });

  // The message reaches scrape_runs.errorMessage and the run history in the UI.
  it("does not leak the API key into the failure message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("upstream is down", { status: 500 })));
    vi.useFakeTimers();

    const outcome = fetchSerpApiJobs(credentials, buildQuery()).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.runAllTimersAsync();
    const settled = await outcome;
    vi.useRealTimers();

    expect(settled).toHaveProperty("error");
    expect(String((settled as { error: Error }).error.message)).not.toContain("serpapi-secret-key");
  });
});
