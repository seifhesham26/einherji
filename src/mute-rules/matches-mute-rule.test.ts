import { describe, expect, it } from "vitest";
import { findMatchingMuteRule, splitMutedJobs, type MuteRuleLike } from "./matches-mute-rule";

function job(company: string, title = "Frontend Developer") {
  return { company, title };
}

const companyRule = (pattern: string): MuteRuleLike => ({ kind: "company", pattern });
const titleRule = (pattern: string): MuteRuleLike => ({ kind: "title", pattern });

describe("findMatchingMuteRule", () => {
  it("matches a company regardless of case", () => {
    expect(findMatchingMuteRule(job("ROBERT HALF"), [companyRule("Robert Half")])).not.toBeNull();
  });

  it("matches a company name the rule is only part of", () => {
    // The agency is listed as "Robert Half International" on one board and
    // "Robert Half" on another. Muting one has to mute both.
    const match = findMatchingMuteRule(job("Robert Half International"), [
      companyRule("robert half"),
    ]);

    expect(match).not.toBeNull();
  });

  it("does not mute a company on a title rule, or the reverse", () => {
    expect(findMatchingMuteRule(job("Acme", "Sales Engineer"), [companyRule("sales")])).toBeNull();
    expect(findMatchingMuteRule(job("Sales Force Ltd", "Engineer"), [titleRule("sales")])).toBeNull();
  });

  it("matches a single word that continues into a longer one", () => {
    // Same containment rule the scrapers use: "recruit" is meant to catch
    // "Recruiting" and "Recruiters", which is the whole reason to write it.
    expect(findMatchingMuteRule(job("Apex Recruiting"), [companyRule("recruit")])).not.toBeNull();
  });

  it("does not match a word the pattern only appears inside", () => {
    // The leading boundary is what stops "half" hitting "Halfords".
    expect(findMatchingMuteRule(job("Chicago Tech"), [companyRule("cago")])).toBeNull();
  });

  it("returns the rule that matched, not just a boolean", () => {
    const rules = [companyRule("acme"), titleRule("intern")];
    const match = findMatchingMuteRule(job("Widgets Ltd", "Marketing Intern"), rules);

    expect(match).toEqual(rules[1]);
  });

  it("ignores a rule that normalises to nothing", () => {
    // A whitespace-only pattern would otherwise match every job on the account.
    expect(findMatchingMuteRule(job("Acme"), [companyRule("   ")])).toBeNull();
  });

  it("matches Arabic text through the same folding the scrapers use", () => {
    expect(
      findMatchingMuteRule(job("شركة الأهرام"), [companyRule("الاهرام")]),
    ).not.toBeNull();
  });

  it("finds nothing when there are no rules", () => {
    expect(findMatchingMuteRule(job("Acme"), [])).toBeNull();
  });
});

describe("splitMutedJobs", () => {
  it("keeps everything when there are no rules", () => {
    const jobs = [job("Acme"), job("Widgets")];
    const { kept, muted } = splitMutedJobs(jobs, []);

    expect(kept).toEqual(jobs);
    expect(muted).toHaveLength(0);
  });

  it("separates the muted from the kept, preserving order", () => {
    const jobs = [job("Acme"), job("Apex Recruiting"), job("Widgets")];
    const { kept, muted } = splitMutedJobs(jobs, [companyRule("apex")]);

    expect(kept.map((entry) => entry.company)).toEqual(["Acme", "Widgets"]);
    expect(muted.map((entry) => entry.company)).toEqual(["Apex Recruiting"]);
  });

  it("mutes on any rule, not only the first", () => {
    const jobs = [job("Acme", "Sales Lead"), job("Apex", "Frontend Developer")];
    const { muted } = splitMutedJobs(jobs, [companyRule("apex"), titleRule("sales")]);

    expect(muted).toHaveLength(2);
  });
});
