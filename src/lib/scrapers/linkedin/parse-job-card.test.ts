import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseJobCards, stripTrackingParams } from "./parse-job-card";

const searchResultsHtml = readFileSync(
  join(__dirname, "__fixtures__/search-results.html"),
  "utf-8",
);

describe("parseJobCards", () => {
  it("parses every card in a page of results", () => {
    const jobs = parseJobCards(searchResultsHtml);
    expect(jobs.length).toBeGreaterThan(0);
  });

  it("extracts the stable job id from the entity urn", () => {
    const [job] = parseJobCards(searchResultsHtml);
    // The urn is the only stable identifier LinkedIn exposes — dedupe depends on it.
    expect(job.sourceJobId).toMatch(/^\d+$/);
  });

  it("populates the fields the jobs table requires as NOT NULL", () => {
    for (const job of parseJobCards(searchResultsHtml)) {
      expect(job.title).toBeTruthy();
      expect(job.company).toBeTruthy();
      expect(job.jobUrl).toMatch(/^https:\/\/[a-z.]*linkedin\.com\//);
      expect(job.source).toBe("linkedin_guest");
    }
  });

  it("strips per-request tracking params so the same job dedupes across runs", () => {
    for (const job of parseJobCards(searchResultsHtml)) {
      expect(job.jobUrl).not.toContain("refId");
      expect(job.jobUrl).not.toContain("trackingId");
      expect(job.jobUrl).not.toContain("?");
    }
  });

  it("parses the posted date into a Date", () => {
    const withDate = parseJobCards(searchResultsHtml).filter((job) => job.postedAt !== null);
    expect(withDate.length).toBeGreaterThan(0);
    for (const job of withDate) {
      expect(job.postedAt).toBeInstanceOf(Date);
      expect(Number.isNaN(job.postedAt!.getTime())).toBe(false);
    }
  });

  it("returns no cards rather than throwing when the markup changes", () => {
    // The canary for selector drift: if LinkedIn restructures, we want an empty
    // result and a failing canary test, not an exception mid-run.
    expect(parseJobCards("<html><body><p>nothing here</p></body></html>")).toEqual([]);
  });
});

describe("stripTrackingParams", () => {
  it("removes the query string and fragment", () => {
    expect(
      stripTrackingParams("https://www.linkedin.com/jobs/view/abc-123?refId=xyz&position=1#top"),
    ).toBe("https://www.linkedin.com/jobs/view/abc-123");
  });

  it("returns null for missing or malformed urls", () => {
    expect(stripTrackingParams(null)).toBeNull();
    expect(stripTrackingParams("not-a-url")).toBeNull();
  });
});
