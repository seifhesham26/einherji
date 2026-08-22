import { describe, expect, it } from "vitest";
import { scrapedJobSchema, type JobSearchQuery, type ScrapedJob } from "../job-source.types";
import { remoteOkSource } from "./remoteok";
import { arbeitnowSource } from "./arbeitnow";
import { jobicySource } from "./jobicy";
import { theMuseSource } from "./themuse";
import { himalayasSource } from "./himalayas";
import { weWorkRemotelySource } from "./weworkremotely";
import { hackerNewsFreelanceSource, hackerNewsSource } from "./hackernews";
import { freelancerSource } from "./freelancer";
import { wuzzufSource } from "./wuzzuf";

// Live canary suite for the free aggregators. Opt-in:
//
//   npm run test:canary
//
// These endpoints are undocumented or informally documented and change without
// notice. The failure mode is "zero results", not an exception — which is
// exactly why this needs to run on a schedule.
const isEnabled = process.env.SCRAPER_CANARY === "1";
const describeCanary = isEnabled ? describe : describe.skip;

// Broad enough to match something on every board regardless of what's listed today.
const BROAD_QUERY: JobSearchQuery = {
  titles: ["engineer", "developer", "designer", "manager"],
  locations: [],
};

const FREE_SOURCES = [
  remoteOkSource,
  arbeitnowSource,
  jobicySource,
  theMuseSource,
  himalayasSource,
  weWorkRemotelySource,
  hackerNewsSource,
  freelancerSource,
];

describeCanary("free aggregators (live)", () => {
  for (const source of FREE_SOURCES) {
    it(`${source.name} returns schema-valid jobs`, async () => {
      const jobs = await source.fetchJobs(BROAD_QUERY);

      expect(jobs.length).toBeGreaterThan(0);

      for (const job of jobs.slice(0, 15)) {
        expect(() => scrapedJobSchema.parse(job)).not.toThrow();
        expect(job.source).toBe(source.name);
        // The columns the jobs table declares NOT NULL.
        expect(job.sourceJobId).toBeTruthy();
        expect(job.title.trim()).toBeTruthy();
        expect(job.company.trim()).toBeTruthy();
        expect(job.jobUrl).toMatch(/^https?:\/\//);
      }

      expectUniqueIds(jobs);
    }, 90_000);
  }

  it("remoteok carries the attribution its API terms require", async () => {
    const jobs = await remoteOkSource.fetchJobs(BROAD_QUERY);
    expect(jobs[0].attributionText).toBe("Jobs by RemoteOK");
    expect(jobs[0].attributionUrl).toBe("https://remoteok.com");
  }, 90_000);

  it("freelancer returns work tagged as freelance", async () => {
    const jobs = await freelancerSource.fetchJobs(BROAD_QUERY);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((job) => job.workType === "freelance")).toBe(true);
  }, 90_000);

  // Wuzzuf is location-scoped by nature, so it can't ride the shared broad query.
  // Two failure modes worth watching separately: the sitemap moving or gaining a
  // Cloudflare challenge, and the detail-page markup drifting away from the SEO
  // tags the parser anchors on.
  it("wuzzuf returns schema-valid Egyptian jobs", async () => {
    const jobs = await wuzzufSource.fetchJobs({
      titles: ["engineer", "accountant", "sales"],
      locations: ["Cairo, Egypt"],
    });

    expect(jobs.length).toBeGreaterThan(0);

    for (const job of jobs) {
      expect(() => scrapedJobSchema.parse(job)).not.toThrow();
      expect(job.source).toBe("wuzzuf");
      expect(job.company.trim()).toBeTruthy();
      // The parser used to return the emotion stylesheet as the description.
      expect(job.description ?? "").not.toMatch(/\.css-|font-size:/);
    }

    // Everything the sitemap filter selected should be Egyptian.
    expect(jobs.some((job) => /egypt/i.test(job.location ?? ""))).toBe(true);
    expectUniqueIds(jobs);
  }, 120_000);

  it("hn freelance thread returns client leads, not freelancers advertising", async () => {
    const jobs = await hackerNewsFreelanceSource.fetchJobs({ titles: [], locations: [] });
    // The thread is monthly and can be thin early in the month, so don't assert a
    // count — assert that anything returned is genuinely a client seeking help.
    for (const job of jobs) {
      expect(job.workType).toBe("freelance");
      expect(job.description?.toLowerCase()).not.toContain("seeking work");
    }
  }, 90_000);
});

function expectUniqueIds(jobs: ScrapedJob[]): void {
  const ids = jobs.map((job) => job.sourceJobId);
  // Duplicates within one source would collide on the unique index and silently
  // drop rows, making the run's counts wrong.
  expect(new Set(ids).size).toBe(ids.length);
}
