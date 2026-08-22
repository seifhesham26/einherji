import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeForMatch, significantWords } from "./match-query";
import type { ScrapedJob } from "../job-source.types";

function buildJob(overrides: Partial<ScrapedJob> = {}): ScrapedJob {
  return {
    sourceJobId: "1",
    source: "remoteok",
    title: "Senior React Developer",
    company: "Acme",
    jobUrl: "https://example.com/job",
    companyUrl: null,
    location: "Cairo, Egypt",
    salary: null,
    description: null,
    postedAt: null,
    workType: "unknown",
    isRemote: false,
    tags: null,
    attributionText: null,
    attributionUrl: null,
    ...overrides,
  };
}

describe("significantWords", () => {
  it("splits an ordinary English phrase", () => {
    expect(significantWords("Senior React Developer")).toEqual(["react", "developer"]);
  });

  // Regression: the old tokenizer split on /[^a-z0-9+#.]+/, so every non-ASCII
  // character was deleted. Arabic produced [] — and an empty list meant "match
  // everything", so an Arabic search silently returned the entire feed.
  it("keeps Arabic words instead of deleting them", () => {
    const words = significantWords("رولات خرائط الرسومات الهندسية");
    expect(words.length).toBeGreaterThan(0);
    expect(words).toContain("رولات");
  });

  it("keeps accented Latin intact", () => {
    expect(significantWords("Zürich Ingénieur")).toEqual(["zürich", "ingénieur"]);
  });

  it("strips the Arabic definite article so both forms meet", () => {
    // "الهندسية" and "هندسية" are the same word with and without "the".
    expect(significantWords("الهندسية")).toEqual(significantWords("هندسية"));
  });

  it("does not strip the article when nothing meaningful is left", () => {
    // "الي" would otherwise collapse to a single letter.
    expect(significantWords("الي")).not.toContain("ي");
  });

  it("falls back to the whole phrase rather than returning nothing", () => {
    // Short tech names are below the minimum word length. Returning [] here
    // would be read as "match everything".
    expect(significantWords("C#")).toEqual(["c#"]);
    expect(significantWords("Go")).toEqual(["go"]);
  });

  it("preserves the characters that make tech names distinct", () => {
    expect(significantWords("C++ and .NET")).toEqual(["c++", ".net"]);
  });
});

describe("normalizeForMatch", () => {
  it("folds Arabic letter variants that mean the same thing", () => {
    expect(normalizeForMatch("مصرية")).toBe(normalizeForMatch("مصريه"));
    expect(normalizeForMatch("إسكندرية")).toBe(normalizeForMatch("اسكندريه"));
  });

  it("removes diacritics", () => {
    expect(normalizeForMatch("مُهَنْدِس")).toBe(normalizeForMatch("مهندس"));
  });
});

describe("matchesQuery", () => {
  it("matches an Arabic title against an Arabic search term", () => {
    const job = buildJob({ title: "مطلوب مهندس مدني", location: null });
    expect(matchesQuery(job, { titles: ["مهندس"], locations: [] })).toBe(true);
  });

  // The bug in practice: before the fix this returned true for everything,
  // so an Arabic search looked like it worked and filtered nothing.
  it("rejects an unrelated job for an Arabic search term", () => {
    const job = buildJob({ title: "Warehouse Operative", location: null });
    expect(matchesQuery(job, { titles: ["مهندس"], locations: [] })).toBe(false);
  });

  it("matches across the Arabic definite article", () => {
    const job = buildJob({ title: "شركة الهندسية للمقاولات", location: null });
    expect(matchesQuery(job, { titles: ["هندسية"], locations: [] })).toBe(true);
  });

  it("matches an Arabic location", () => {
    const job = buildJob({ title: "مهندس", location: "القاهرة" });
    expect(matchesQuery(job, { titles: [], locations: ["القاهره"] })).toBe(true);
  });

  // Leading boundary: plain substring matching would make "Go" hit "Chicago".
  it("does not match a short Latin term inside an unrelated word", () => {
    const job = buildJob({ title: "Chicago Sales Assistant", location: null });
    expect(matchesQuery(job, { titles: ["Go"], locations: [] })).toBe(false);
  });

  it("still matches that term as its own word", () => {
    const job = buildJob({ title: "Go Backend Engineer", location: null });
    expect(matchesQuery(job, { titles: ["Go"], locations: [] })).toBe(true);
  });

  // Regression: requiring a boundary at both ends stopped plurals matching, and
  // a live scrape came back empty. The matcher is documented as lenient — a term
  // may run on into a longer word, it just can't start mid-word.
  it.each([
    ["Web Developers Needed", "Developer"],
    ["Engineering Manager", "Engineer"],
    ["React.js Specialist", "React"],
    ["Mobile App Development", "Develop"],
  ])("matches %s against the term %s", (title, term) => {
    const job = buildJob({ title, location: null });
    expect(matchesQuery(job, { titles: [term], locations: [] })).toBe(true);
  });

  it("keeps matching ordinary English searches leniently", () => {
    const job = buildJob({ title: "Senior Frontend Developer", location: null });
    expect(matchesQuery(job, { titles: ["Frontend Engineer"], locations: [] })).toBe(true);
  });

  it("matches on tags as well as the title", () => {
    const job = buildJob({ title: "Software Engineer", tags: ["react", "typescript"], location: null });
    expect(matchesQuery(job, { titles: ["React"], locations: [] })).toBe(true);
  });

  it("treats an empty search as no filter", () => {
    expect(matchesQuery(buildJob(), { titles: [], locations: [] })).toBe(true);
  });
});

// Regression: "remote" was a wildcard on both sides. The paper factory bucket
// asks for Cairo and Giza because that is where the paper can be delivered, and
// it filled up with remote software roles from every board it was pointed at.
describe("matchesQuery — location", () => {
  it("rejects a remote job when the search only named physical places", () => {
    const job = buildJob({ title: "Engineering Manager", location: "Remote", isRemote: true });
    expect(matchesQuery(job, { titles: [], locations: ["Cairo", "Giza"] })).toBe(false);
  });

  it("rejects a remote job that carries no location at all", () => {
    // Unlabelled jobs pass the filter, but a job flagged remote isn't unlabelled.
    const job = buildJob({ title: "Engineering Manager", location: null, isRemote: true });
    expect(matchesQuery(job, { titles: [], locations: ["Cairo"] })).toBe(false);
  });

  it("accepts a remote job when the search asked for remote", () => {
    const job = buildJob({ location: "Remote", isRemote: true });
    expect(matchesQuery(job, { titles: [], locations: ["Remote", "Cairo"] })).toBe(true);
  });

  it("accepts a remote job that names a place the search asked for", () => {
    // "Remote — Cairo" is a Cairo result even for a search that never said remote.
    const job = buildJob({ location: "Remote — Cairo, Egypt", isRemote: true });
    expect(matchesQuery(job, { titles: [], locations: ["Cairo"] })).toBe(true);
  });

  it("rejects an onsite job elsewhere even when the search accepts remote", () => {
    // Listing "Remote" used to make the whole location filter a no-op, so a
    // Berlin-only role counted as a match for someone who can't move to Berlin.
    const job = buildJob({ location: "Berlin, Germany", isRemote: false });
    expect(matchesQuery(job, { titles: [], locations: ["Remote", "Cairo"] })).toBe(false);
  });

  it("still lets an unlabelled non-remote job through", () => {
    const job = buildJob({ location: null, isRemote: false });
    expect(matchesQuery(job, { titles: [], locations: ["Cairo"] })).toBe(true);
  });

  it("keeps the paper factory bucket clear of remote software roles", () => {
    const paperFactory = {
      titles: ["engineering consultant", "architecture", "contractor", "مقاولات"],
      locations: ["Cairo", "Giza", "القاهرة", "الجيزة"],
    };

    const remoteSoftwareJob = buildJob({
      title: "Senior Software Engineer",
      tags: ["engineering", "backend"],
      location: "Remote",
      isRemote: true,
    });

    expect(matchesQuery(remoteSoftwareJob, paperFactory)).toBe(false);
  });
});
