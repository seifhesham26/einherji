import { describe, expect, it } from "vitest";
import { fetchGreenhouseJobs } from "./ats/greenhouse";
import { fetchLeverJobs } from "./ats/lever";
import { fetchAshbyJobs } from "./ats/ashby";
import { buildSlugCandidates, detectAts } from "./ats/detect-ats";
import { linkedInJobSource } from "./linkedin/search-jobs";
import { scrapedJobSchema } from "./job-source.types";

// Live canary suite. Hits real endpoints, so it's opt-in:
//
//   SCRAPER_CANARY=1 npx vitest run src/lib/scrapers/canary.test.ts
//
// Run it on a schedule. Scrapers rot silently — LinkedIn changes its markup and
// ATS vendors move endpoints without notice, and the failure mode is "zero
// results" rather than an exception. This is how you find out from a red check
// instead of from a user.
const isEnabled = process.env.SCRAPER_CANARY === "1";
const describeCanary = isEnabled ? describe : describe.skip;

// Long-lived boards, chosen because they're unlikely to disappear.
const GREENHOUSE_FIXTURE_SLUG = "stripe";
const LEVER_FIXTURE_SLUG = "leverdemo";
const ASHBY_FIXTURE_SLUG = "ramp";

describeCanary("ATS sources (live)", () => {
  it("greenhouse returns schema-valid jobs", async () => {
    const jobs = await fetchGreenhouseJobs(GREENHOUSE_FIXTURE_SLUG, "Stripe");
    expect(jobs.length).toBeGreaterThan(0);
    for (const job of jobs.slice(0, 20)) {
      expect(() => scrapedJobSchema.parse(job)).not.toThrow();
    }
    expect(jobs.some((job) => job.description && job.description.length > 100)).toBe(true);
  }, 60_000);

  it("lever returns schema-valid jobs", async () => {
    const jobs = await fetchLeverJobs(LEVER_FIXTURE_SLUG, "Lever Demo");
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].source).toBe("lever");
    expect(jobs[0].postedAt).toBeInstanceOf(Date);
  }, 60_000);

  it("ashby returns schema-valid jobs", async () => {
    const jobs = await fetchAshbyJobs(ASHBY_FIXTURE_SLUG, "Ramp");
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].jobUrl).toContain("ashbyhq.com");
  }, 60_000);

  it("resolves a company name to its board without a careers url", async () => {
    const detected = await detectAts("Stripe");
    expect(detected).not.toBeNull();
    expect(detected!.provider).toBe("greenhouse");
  }, 60_000);
});

describeCanary("LinkedIn guest source (live)", () => {
  it("streams schema-valid jobs with descriptions", async () => {
    const controller = new AbortController();
    const collected = [];

    const stream = linkedInJobSource.search(
      { titles: ["software engineer"], locations: ["United States"] },
      { existingSourceJobIds: new Set(), signal: controller.signal },
    );

    for await (const job of stream) {
      collected.push(job);
      // Enough to prove the pipeline; no reason to hammer the endpoint.
      if (collected.length >= 3) break;
    }
    controller.abort();

    expect(collected.length).toBeGreaterThan(0);
    for (const job of collected) {
      expect(() => scrapedJobSchema.parse(job)).not.toThrow();
      expect(job.jobUrl).not.toContain("refId");
    }
  }, 120_000);
});

// Pure, so it always runs.
describe("buildSlugCandidates", () => {
  it("strips legal suffixes", () => {
    expect(buildSlugCandidates("Acme Corp, Inc.")).toEqual(["acme"]);
  });

  it("produces joined and hyphenated forms for multi-word names", () => {
    const candidates = buildSlugCandidates("Blossom Health");
    expect(candidates).toContain("blossomhealth");
    expect(candidates).toContain("blossom-health");
    expect(candidates).toContain("blossom");
  });
});
