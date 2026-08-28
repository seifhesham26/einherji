import { annualiseSalary, normaliseCurrency } from "./annualise-salary";
import type { ExtractedJobFacts } from "./job-insights.validators";
import type { JobFactsUpdate } from "./job-insights.db";

/**
 * Turns one model reply into the columns the list can be filtered on.
 *
 * The seam between what a model said and what the database believes, so it lives
 * on its own and is tested on its own — everything wrong here is wrong silently,
 * and a salary filter built on a bad conversion returns a plausible list of the
 * wrong jobs.
 *
 * The annual figures are computed here rather than asked for, so the arithmetic
 * can be checked. Anything that can't be put on an annual scale — a figure with
 * no stated period — is stored as null rather than guessed, because a filter
 * that silently included invented numbers is worse than one that leaves rows
 * out: the user can see the second kind of mistake.
 */
export function toJobFactsUpdate(facts: ExtractedJobFacts): JobFactsUpdate {
  const period = facts.salary?.period ?? null;

  return {
    seniority: facts.seniority,
    yearsExperienceMin: facts.yearsExperienceMin,
    techStack: facts.techStack,
    salaryMinAnnual: annualiseSalary(facts.salary?.min, period),
    salaryMaxAnnual: annualiseSalary(facts.salary?.max, period),
    salaryCurrency: normaliseCurrency(facts.salary?.currency),
    remotePolicy: facts.remotePolicy,
    offersVisaSponsorship: facts.offersVisaSponsorship,
    // Models answer "en-GB" about as often as "en", and the column is compared
    // against two-letter codes.
    postingLanguage: facts.language?.slice(0, 2).toLowerCase() ?? null,
  };
}
