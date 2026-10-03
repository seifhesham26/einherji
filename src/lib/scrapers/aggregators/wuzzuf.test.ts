import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WUZZUF_JOB_PAGE_HTML, WUZZUF_SITEMAP_XML } from "./__fixtures__/wuzzuf-job-page";
import { parseSitemapUrls, parseWuzzufJobPage, selectMatchingUrls } from "./wuzzuf";

const JOB_URL = "https://wuzzuf.net/jobs/p/pskpkwph4fao-sr-banking-treasury-raqmu-giza-egypt";
const SITEMAP_LASTMOD = "2026-08-22T02:12:46+03:00";

describe("parseSitemapUrls", () => {
  it("keeps job URLs and drops everything else in the sitemap", () => {
    const entries = parseSitemapUrls(WUZZUF_SITEMAP_XML);

    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.url.includes("/jobs/p/"))).toBe(true);
    expect(entries[0].lastModified).toBe(SITEMAP_LASTMOD);
  });
});

describe("selectMatchingUrls", () => {
  const entries = parseSitemapUrls(WUZZUF_SITEMAP_XML);

  // The whole point of filtering on the slug: the sitemap is ~5,600 jobs and
  // each detail page is most of a megabyte, so the narrowing has to happen
  // before any request is made.
  it("filters on the slug so no request is spent on a non-match", () => {
    const selected = selectMatchingUrls(entries, ["software engineer"], ["Cairo"]);

    expect(selected.map((entry) => entry.url)).toEqual([
      "https://wuzzuf.net/jobs/p/aaa111-senior-software-engineer-acme-cairo-egypt",
    ]);
  });

  it("excludes the right country — the Dubai listing shares the keyword", () => {
    const selected = selectMatchingUrls(entries, ["software engineer"], ["Dubai"]);

    expect(selected).toHaveLength(1);
    expect(selected[0].url).toContain("dubai-united-arab-emirates");
  });

  it("returns newest first so the page cap spends requests on fresh jobs", () => {
    const selected = selectMatchingUrls(entries, [], []);

    expect(selected.map((entry) => entry.lastModified)).toEqual([
      "2026-08-22T02:12:46+03:00",
      "2026-08-21T02:12:46+03:00",
      "2026-08-20T02:12:46+03:00",
    ]);
  });

  it("treats an empty search as a match rather than filtering everything out", () => {
    expect(selectMatchingUrls(entries, [], [])).toHaveLength(3);
  });
});

describe("parseWuzzufJobPage", () => {
  let job: ReturnType<typeof parseWuzzufJobPage>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    job = parseWuzzufJobPage(WUZZUF_JOB_PAGE_HTML, JOB_URL, SITEMAP_LASTMOD);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the job from the server-rendered markup", () => {
    expect(job).not.toBeNull();
    expect(job?.title).toBe("Sr. Banking & Treasury");
    expect(job?.location).toBe("6th of October, Giza, Egypt");
    expect(job?.jobUrl).toBe(
      "https://wuzzuf.net/jobs/p/pskpkwph4fao-sr-banking-treasury-raqmu-giza-egypt",
    );
    expect(job?.companyUrl).toBe("https://wuzzuf.net/jobs/careers/RAQMU-Egypt-133433");
  });

  // Regression: the header link truncates long names, so leads were stored as
  // "RAQMU for Building and C..." and matched nothing.
  it("prefers the full company name from the title over the truncated link text", () => {
    expect(job?.company).toBe("RAQMU for Building and Construction");
  });

  // Regression: normalizeWorkType ran over the whole description, where "internal
  // policies" made a senior treasury role an internship. The type comes from the
  // browse-link hrefs now, which are the only server-rendered classification.
  it("reads work type from the browse links, not the description text", () => {
    expect(job?.workType).toBe("full_time");
    expect(job?.isRemote).toBe(false);
  });

  // Regression: emotion inlines <style> next to the content it styles, so the
  // description came back starting with ".css-n7fcne{font-size:14px…}".
  it("strips inlined emotion CSS out of the description", () => {
    expect(job?.description).not.toMatch(/css-|font-size|<style/);
    expect(job?.description).toContain("Manage daily banking operations");
    // Both sections, with the heading text itself removed.
    expect(job?.description).toContain("Proven expertise in Banking and Finance");
    expect(job?.description).not.toMatch(/^Job Description/);
  });

  it("prefers the posted age in the header over the sitemap lastmod", () => {
    expect(job?.postedAt).toBeInstanceOf(Date);
    expect(job?.postedAt?.toISOString()).toBe("2026-08-03T12:00:00.000Z");
  });

  it.each([
    ["2026-10-03T12:00:00.000Z", "2026-09-14T12:00:00.000Z"],
    ["2030-01-20T12:00:00.000Z", "2030-01-01T12:00:00.000Z"],
  ])("interprets the posted age relative to %s", (now, expected) => {
    vi.setSystemTime(new Date(now));

    const parsed = parseWuzzufJobPage(
      WUZZUF_JOB_PAGE_HTML,
      JOB_URL,
      SITEMAP_LASTMOD,
    );

    expect(parsed?.postedAt?.toISOString()).toBe(expected);
  });

  it("keeps the category as a tag so it widens title matching", () => {
    expect(job?.tags).toEqual(["Accounting/Finance"]);
  });

  // The bucket decides: a Cairo bucket that also lists "Remote" must get the
  // Egyptian work-from-home listings too, and those are flagged only by the
  // workplace badge in the header.
  it("flags a work-from-home listing as remote from the browse link", () => {
    const remoteHtml = WUZZUF_JOB_PAGE_HTML.replace(
      "/a/On-Site-Jobs-in-Egypt",
      "/a/Remote-Jobs-in-Egypt",
    ).replace(">On-site<", ">Remote<");

    const remoteJob = parseWuzzufJobPage(remoteHtml, JOB_URL, SITEMAP_LASTMOD);

    expect(remoteJob?.isRemote).toBe(true);
    // Still an Egyptian listing — the location is not overwritten by the flag.
    expect(remoteJob?.location).toContain("Egypt");
  });

  it("returns null rather than a junk record when the page has no job on it", () => {
    expect(parseWuzzufJobPage("<html><body>Not found</body></html>", JOB_URL, null)).toBeNull();
  });
});
