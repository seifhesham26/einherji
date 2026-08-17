import { describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

// Live integration test. Writes to the configured database and hits real job
// boards, so it's opt-in:
//
//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/scraping/scraping.integration.test.ts
//
// Point it at a development database — it inserts a tracked company and real jobs.
const testUserId = process.env.SCRAPER_TEST_USER_ID;
const isEnabled = process.env.SCRAPER_INTEGRATION === "1" && Boolean(testUserId);
const describeIntegration = isEnabled ? describe : describe.skip;

describeIntegration("scrape pipeline (live, writes to db)", () => {
  it("adds a company, resolves its board, scrapes it, and stores jobs", async () => {
    const { db } = await import("@/lib/db");
    const { addTrackedCompany, removeTrackedCompany } = await import(
      "@/companies/companies.service"
    );
    const { startScrape } = await import("./scraping.service");
    const { getAllJobs } = await import("@/jobs/jobs.db");

    const userId = testUserId!;

    // Stripe runs a large Greenhouse board, so this exercises the full path.
    const company = await addTrackedCompany(db, userId, { name: "Stripe" });
    expect(company.atsProvider).toBe("greenhouse");
    expect(company.atsSlug).toBeTruthy();

    try {
      const run = await startScrape(db, userId, { sources: ["greenhouse"] });

      expect(run).not.toBeNull();
      expect(run!.status).toBe("completed");
      expect(run!.tasksCompleted).toBe(run!.tasksTotal);
      expect(run!.jobsFound).toBeGreaterThan(0);

      const jobs = await getAllJobs(db, userId);
      const greenhouseJobs = jobs.filter((job) => job.source === "greenhouse");
      expect(greenhouseJobs.length).toBeGreaterThan(0);

      // The NOT NULL columns the old Apify path used to violate.
      for (const job of greenhouseJobs.slice(0, 10)) {
        expect(job.sourceJobId).toBeTruthy();
        expect(job.title).toBeTruthy();
        expect(job.company).toBeTruthy();
        expect(job.jobUrl).toMatch(/^https?:\/\//);
      }

      // Re-running must not duplicate: this is what the NOT NULL sourceJobId and
      // the (userId, source, sourceJobId) unique index exist to guarantee.
      const secondRun = await startScrape(db, userId, { sources: ["greenhouse"] });
      expect(secondRun!.jobsInserted).toBe(0);

      const jobsAfter = await getAllJobs(db, userId);
      expect(jobsAfter.length).toBe(jobs.length);
    } finally {
      await removeTrackedCompany(db, userId, { id: company.id }).catch(() => undefined);
    }
  }, 180_000);

  it("scrapes aggregators without any company list and tags work types", async () => {
    const { db } = await import("@/lib/db");
    const { startScrape } = await import("./scraping.service");
    const { deleteJobsBySource, getAllJobs } = await import("@/jobs/jobs.db");

    const userId = testUserId!;

    // Start clean: dedupe means existing rows are never rewritten, so leftovers
    // from an earlier run would be asserted against instead of fresh output.
    for (const source of ["remoteok", "arbeitnow", "freelancer"] as const) {
      await deleteJobsBySource(db, userId, source);
    }

    // Aggregators are keyword-driven, so this needs no tracked companies at all.
    const run = await startScrape(db, userId, {
      sources: ["remoteok", "arbeitnow", "freelancer"],
    });

    expect(run!.status).toBe("completed");
    expect(run!.tasksCompleted).toBe(3);
    expect(run!.jobsFound).toBeGreaterThan(0);

    const jobs = await getAllJobs(db, userId);

    // Every column the sources populate must survive the insert — workType and
    // the attribution fields were silently dropped by an incomplete mapping.
    const freelanceJobs = jobs.filter((job) => job.source === "freelancer");
    expect(freelanceJobs.length).toBeGreaterThan(0);
    expect(freelanceJobs.every((job) => job.workType === "freelance")).toBe(true);

    // RemoteOK's API terms require attribution to be stored and shown.
    const remoteOkJobs = jobs.filter((job) => job.source === "remoteok");
    expect(remoteOkJobs.length).toBeGreaterThan(0);
    expect(remoteOkJobs[0].attributionUrl).toBe("https://remoteok.com");
    expect(remoteOkJobs[0].attributionText).toBe("Jobs by RemoteOK");
    expect(remoteOkJobs.some((job) => (job.tags?.length ?? 0) > 0)).toBe(true);
  }, 180_000);

  // A partial unique index with a wrong predicate creates cleanly and then does
  // nothing, so the only way to know it works is to make the database reject a
  // second run. This is what stops a double-click from doubling our request rate.
  it("refuses a second running row at the database level", async () => {
    const { db } = await import("@/lib/db");
    const { insertScrapeRun, isUniqueViolation, finishScrapeRunIfRunning } = await import(
      "./scraping.db"
    );

    const first = await insertScrapeRun(db, testUserId!, {
      sources: ["remoteok"],
      tasksTotal: 1,
    });

    try {
      const second = await insertScrapeRun(db, testUserId!, {
        sources: ["remoteok"],
        tasksTotal: 1,
      }).then(
        () => null,
        (error: unknown) => error,
      );

      expect(second, "the index let a second running row through").not.toBeNull();
      // Drizzle wraps the driver error, so the 23505 code sits on `cause` rather
      // than on the thrown error. Reading only the top level matches nothing.
      expect(isUniqueViolation(second)).toBe(true);
    } finally {
      await finishScrapeRunIfRunning(db, first.id, { status: "completed" });
    }

    // And once the first run is no longer 'running', the next one is allowed.
    const third = await insertScrapeRun(db, testUserId!, {
      sources: ["remoteok"],
      tasksTotal: 1,
    });
    await finishScrapeRunIfRunning(db, third.id, { status: "completed" });
  }, 60_000);

  // Regression: cancelling wrote "cancelled", then the loop that was being
  // cancelled finished and overwrote it with "completed".
  it("does not let a finishing run overwrite a cancellation", async () => {
    const { db } = await import("@/lib/db");
    const { insertScrapeRun, cancelScrapeRun, finishScrapeRunIfRunning } = await import(
      "./scraping.db"
    );

    const run = await insertScrapeRun(db, testUserId!, {
      sources: ["remoteok"],
      tasksTotal: 1,
    });

    const cancelled = await cancelScrapeRun(db, testUserId!, run.id);
    expect(cancelled?.status).toBe("cancelled");

    const finished = await finishScrapeRunIfRunning(db, run.id, { status: "completed" });
    expect(finished?.status).toBe("cancelled");
  }, 60_000);

  it("skips a credentialed source with no key instead of failing the run", async () => {
    const { db } = await import("@/lib/db");
    const { startScrape } = await import("./scraping.service");

    // adzuna needs an API key. With none saved the task should complete as a
    // no-op rather than erroring — an unconfigured source is a state, not a fault.
    const run = await startScrape(db, testUserId!, { sources: ["adzuna", "remoteok"] });

    expect(run!.status).toBe("completed");
    expect(run!.tasksCompleted).toBe(2);
  }, 120_000);
});
