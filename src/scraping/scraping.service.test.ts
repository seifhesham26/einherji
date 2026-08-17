import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

// The orchestrator's own logic — cancellation, the one-run-at-a-time guard, and
// whether a failing source is actually reported — is what's under test here, so
// everything it reaches for is stubbed. The live pipeline is covered separately
// by scraping.integration.test.ts.

const scrapeRunState = {
  id: "run_1",
  userId: "user_1",
  status: "running" as string,
  startedAt: new Date(),
  tasksTotal: 0,
  tasksCompleted: 0,
  jobsFound: 0,
  jobsInserted: 0,
  errorMessage: null as string | null,
};

const mocks = {
  getLatestScrapeRun: vi.fn(),
  getScrapeRunStatus: vi.fn(),
  insertScrapeRun: vi.fn(),
  finishScrapeRunIfRunning: vi.fn(),
  getScrapeRunById: vi.fn(),
  recordTaskProgress: vi.fn(),
  failStaleRun: vi.fn(),
  fetchAggregatorJobs: vi.fn(),
  insertJobs: vi.fn(),
};

vi.mock("./scraping.db", async (importOriginal) => ({
  // isUniqueViolation is the real one — mocking it would hide the fact that the
  // code sits on `cause`, which is exactly the bug the live test caught.
  isUniqueViolation: (await importOriginal<typeof import("./scraping.db")>()).isUniqueViolation,
  getLatestScrapeRun: (...args: unknown[]) => mocks.getLatestScrapeRun(...args),
  getScrapeRunStatus: (...args: unknown[]) => mocks.getScrapeRunStatus(...args),
  getScrapeRunById: (...args: unknown[]) => mocks.getScrapeRunById(...args),
  insertScrapeRun: (...args: unknown[]) => mocks.insertScrapeRun(...args),
  finishScrapeRunIfRunning: (...args: unknown[]) => mocks.finishScrapeRunIfRunning(...args),
  recordTaskProgress: (...args: unknown[]) => mocks.recordTaskProgress(...args),
  failStaleRun: (...args: unknown[]) => mocks.failStaleRun(...args),
  cancelScrapeRun: vi.fn(),
}));

vi.mock("@/criteria/criteria.db", () => ({
  getActiveCriteria: vi.fn(async () => ({
    titles: ["React Developer"],
    locations: ["Remote"],
    salaryMin: null,
  })),
}));
vi.mock("@/settings/settings.db", () => ({ getSettingsByUserId: vi.fn(async () => null) }));
vi.mock("@/companies/companies.db", () => ({ getResolvedCompanies: vi.fn(async () => []) }));
vi.mock("@/credentials/credentials.service", () => ({ resolveCredentials: vi.fn(async () => null) }));
vi.mock("@/jobs/jobs.db", () => ({
  getExistingSourceJobIds: vi.fn(async () => new Set<string>()),
  insertJobs: (...args: unknown[]) => mocks.insertJobs(...args),
}));
vi.mock("@/lib/scrapers/aggregators/fetch-aggregator-jobs", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchAggregatorJobs: (...args: unknown[]) => mocks.fetchAggregatorJobs(...args),
}));

const db = {} as never;

describe("startScrape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scrapeRunState.status = "running";
    scrapeRunState.errorMessage = null;

    mocks.getLatestScrapeRun.mockResolvedValue(null);
    mocks.getScrapeRunStatus.mockResolvedValue("running");
    mocks.insertScrapeRun.mockResolvedValue(scrapeRunState);
    mocks.getScrapeRunById.mockImplementation(async () => scrapeRunState);
    mocks.recordTaskProgress.mockResolvedValue(undefined);
    mocks.finishScrapeRunIfRunning.mockImplementation(async (_db, _id, outcome) => ({
      ...scrapeRunState,
      ...outcome,
    }));
    mocks.fetchAggregatorJobs.mockResolvedValue([]);
    mocks.insertJobs.mockResolvedValue([]);
  });

  it("refuses to start while another run is in flight", async () => {
    const { startScrape } = await import("./scraping.service");
    mocks.getLatestScrapeRun.mockResolvedValue({
      id: "run_0",
      status: "running",
      startedAt: new Date(),
    });

    // Two concurrent runs means double the requests to the same boards from one
    // IP, which is the quickest way to get the whole app blocked.
    await expect(startScrape(db, "user_1", { sources: ["remoteok"] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(mocks.insertScrapeRun).not.toHaveBeenCalled();
  });

  it("retires a run left 'running' by a dead process instead of blocking forever", async () => {
    const { startScrape } = await import("./scraping.service");
    mocks.getLatestScrapeRun.mockResolvedValue({
      id: "run_0",
      status: "running",
      startedAt: new Date(Date.now() - 60 * 60_000),
    });

    await startScrape(db, "user_1", { sources: ["remoteok"] });

    expect(mocks.failStaleRun).toHaveBeenCalledWith(db, "run_0");
    expect(mocks.insertScrapeRun).toHaveBeenCalled();
  });

  it("maps a unique-index violation to the same conflict as the pre-check", async () => {
    const { startScrape } = await import("./scraping.service");
    // Shaped like the real thing: Drizzle throws a wrapper and puts the driver's
    // NeonDbError — the one carrying the 23505 — on `cause`.
    mocks.insertScrapeRun.mockRejectedValue(
      Object.assign(new Error("Failed query: insert into scrape_runs …"), {
        cause: Object.assign(new Error("duplicate key value"), {
          code: "23505",
          constraint: "scrape_runs_one_active_per_user_idx",
        }),
      }),
    );

    await expect(startScrape(db, "user_1", { sources: ["remoteok"] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  // Regression: cancel used to write "cancelled" to the row, then this loop would
  // run to completion and overwrite it with "completed" — while still hammering
  // every remaining source.
  it("stops mid-run when the row is marked cancelled, and does not report success", async () => {
    const { startScrape } = await import("./scraping.service");
    scrapeRunState.status = "cancelled";
    mocks.getScrapeRunStatus.mockResolvedValue("cancelled");

    const result = await startScrape(db, "user_1", {
      sources: ["remoteok", "arbeitnow", "jobicy"],
    });

    expect(mocks.fetchAggregatorJobs).not.toHaveBeenCalled();
    expect(mocks.finishScrapeRunIfRunning).not.toHaveBeenCalled();
    expect(result?.status).toBe("cancelled");
  });

  // Regression: every task error was swallowed by a bare `catch {}`, so a broken
  // adapter and a board with no openings looked identical — both zero jobs, no
  // error. Two real bugs hid there.
  it("reports which sources failed rather than silently returning zero jobs", async () => {
    const { startScrape } = await import("./scraping.service");
    mocks.fetchAggregatorJobs.mockImplementation(async (source: string) => {
      if (source === "remoteok") throw new Error("503 from remoteok");
      return [];
    });

    const result = await startScrape(db, "user_1", { sources: ["remoteok", "arbeitnow"] });

    // The run still completes — one bad source must not sink the others.
    expect(result?.status).toBe("completed");
    expect(result?.errorMessage).toMatch(/1 source failed/i);
    expect(result?.errorMessage).toMatch(/503 from remoteok/);
    expect(mocks.recordTaskProgress).toHaveBeenCalledTimes(2);
  });

  it("says nothing when every source succeeds", async () => {
    const { startScrape } = await import("./scraping.service");

    const result = await startScrape(db, "user_1", { sources: ["remoteok"] });

    expect(result?.status).toBe("completed");
    expect(result?.errorMessage).toBeNull();
  });

  // A repeated source would be counted twice in tasksTotal and scraped twice.
  it("deduplicates the requested sources", async () => {
    const { startScrape } = await import("./scraping.service");

    await startScrape(db, "user_1", { sources: ["remoteok", "remoteok", "arbeitnow"] });

    expect(mocks.insertScrapeRun).toHaveBeenCalledWith(
      db,
      "user_1",
      expect.objectContaining({ tasksTotal: 2 }),
    );
  });

  it("rejects a run with nothing to scrape rather than creating an empty one", async () => {
    const { startScrape } = await import("./scraping.service");

    await expect(startScrape(db, "user_1", { sources: ["greenhouse"] })).rejects.toBeInstanceOf(
      TRPCError,
    );
    expect(mocks.insertScrapeRun).not.toHaveBeenCalled();
  });
});
