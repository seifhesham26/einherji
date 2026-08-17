import { describe, expect, it } from "vitest";
import { parseScrapedJob, scrapedJobSchema } from "./job-source.types";

const validJob = {
  sourceJobId: "12345",
  source: "greenhouse",
  title: "Senior Engineer",
  company: "Acme",
  jobUrl: "https://boards.greenhouse.io/acme/jobs/12345",
};

describe("scrapedJobSchema", () => {
  it("defaults the optional fields rather than requiring every source to supply them", () => {
    const job = scrapedJobSchema.parse(validJob);
    expect(job.location).toBeNull();
    expect(job.description).toBeNull();
    expect(job.postedAt).toBeNull();
  });

  it("nulls out placeholder values boards leave in unfilled templates", () => {
    // Stripe's Greenhouse board really does return "LOCATION" for some postings.
    expect(scrapedJobSchema.parse({ ...validJob, location: "LOCATION" }).location).toBeNull();
    expect(scrapedJobSchema.parse({ ...validJob, location: "N/A" }).location).toBeNull();
    expect(scrapedJobSchema.parse({ ...validJob, location: "  -  " }).location).toBeNull();
  });

  it("keeps real locations and trims them", () => {
    expect(scrapedJobSchema.parse({ ...validJob, location: "  London  " }).location).toBe("London");
  });

  it("coerces date strings and epoch dates", () => {
    expect(scrapedJobSchema.parse({ ...validJob, postedAt: "2026-07-30" }).postedAt).toBeInstanceOf(Date);
    expect(scrapedJobSchema.parse({ ...validJob, postedAt: new Date(1553186035299) }).postedAt).toBeInstanceOf(Date);
  });
});

describe("parseScrapedJob", () => {
  it("returns null instead of throwing so one bad record can't abort a run", () => {
    expect(parseScrapedJob({ ...validJob, jobUrl: "not-a-url" })).toBeNull();
    expect(parseScrapedJob({ ...validJob, title: "" })).toBeNull();
    // sourceJobId is NOT NULL in the database — rejecting here is what stops it
    // becoming a constraint violation at insert time.
    expect(parseScrapedJob({ ...validJob, sourceJobId: undefined })).toBeNull();
  });

  it("accepts a well-formed record", () => {
    expect(parseScrapedJob(validJob)).not.toBeNull();
  });
});
