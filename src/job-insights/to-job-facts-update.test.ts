import { describe, expect, it } from "vitest";
import { toJobFactsUpdate } from "./to-job-facts-update";
import type { ExtractedJobFacts } from "./job-insights.validators";

// The seam between what a model said and what goes in the columns the list is
// filtered on. Everything wrong here is wrong silently — a salary filter built
// on a bad conversion returns a plausible list of the wrong jobs.

function facts(overrides: Partial<ExtractedJobFacts> = {}): ExtractedJobFacts {
  return {
    seniority: "senior",
    yearsExperienceMin: 5,
    techStack: ["React", "TypeScript"],
    salary: { min: 60_000, max: 80_000, currency: "usd", period: "year" },
    remotePolicy: "hybrid",
    offersVisaSponsorship: null,
    language: "en",
    ...overrides,
  };
}

describe("toJobFactsUpdate", () => {
  it("carries the plain fields straight across", () => {
    const update = toJobFactsUpdate(facts());

    expect(update.seniority).toBe("senior");
    expect(update.yearsExperienceMin).toBe(5);
    expect(update.techStack).toEqual(["React", "TypeScript"]);
    expect(update.remotePolicy).toBe("hybrid");
  });

  it("annualises a monthly band on both ends", () => {
    const update = toJobFactsUpdate(
      facts({ salary: { min: 4_000, max: 6_000, currency: "EGP", period: "month" } }),
    );

    expect(update.salaryMinAnnual).toBe(48_000);
    expect(update.salaryMaxAnnual).toBe(72_000);
  });

  it("normalises the currency code", () => {
    expect(toJobFactsUpdate(facts()).salaryCurrency).toBe("USD");
  });

  it("drops a currency that isn't a code", () => {
    const update = toJobFactsUpdate(
      facts({ salary: { min: 60_000, max: null, currency: "$", period: "year" } }),
    );

    expect(update.salaryCurrency).toBeNull();
    // The figure survives — an unrecognised currency label is no reason to throw
    // away a number the posting actually stated.
    expect(update.salaryMinAnnual).toBe(60_000);
  });

  it("stores nothing for a salary with no period", () => {
    // "50000" with no period could be a year in USD or a month in EGP. Filling
    // one in would be right often enough to be trusted and wrong often enough to
    // matter.
    const update = toJobFactsUpdate(
      facts({ salary: { min: 50_000, max: null, currency: "EGP", period: null } }),
    );

    expect(update.salaryMinAnnual).toBeNull();
    expect(update.salaryMaxAnnual).toBeNull();
  });

  it("handles a posting with no salary at all", () => {
    const update = toJobFactsUpdate(facts({ salary: null }));

    expect(update.salaryMinAnnual).toBeNull();
    expect(update.salaryMaxAnnual).toBeNull();
    expect(update.salaryCurrency).toBeNull();
  });

  it("keeps a one-sided band one-sided", () => {
    const update = toJobFactsUpdate(
      facts({ salary: { min: null, max: 90_000, currency: "GBP", period: "year" } }),
    );

    expect(update.salaryMinAnnual).toBeNull();
    expect(update.salaryMaxAnnual).toBe(90_000);
  });

  it("cuts a regional tag off the language", () => {
    // Models answer "en-GB" about as often as "en", and the column is compared
    // against two-letter codes.
    expect(toJobFactsUpdate(facts({ language: "en-GB" })).postingLanguage).toBe("en");
    expect(toJobFactsUpdate(facts({ language: "AR" })).postingLanguage).toBe("ar");
  });

  it("keeps silence about sponsorship as silence", () => {
    // Null is not "no". Most postings say nothing, and reading that as a refusal
    // would hide most of the market from anyone who needs sponsorship.
    expect(toJobFactsUpdate(facts({ offersVisaSponsorship: null })).offersVisaSponsorship)
      .toBeNull();
    expect(toJobFactsUpdate(facts({ offersVisaSponsorship: false })).offersVisaSponsorship)
      .toBe(false);
  });
});
