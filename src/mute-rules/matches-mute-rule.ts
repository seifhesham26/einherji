import { haystackContains, normalizeForMatch } from "@/lib/scrapers/aggregators/match-query";
import type { MuteRuleKind } from "./mute-rules.validators";

/**
 * Whether a posting is something the user has said they never want to see.
 *
 * Kept pure and kept here so the same decision can be made at scrape time (where
 * it stops the row being written) and at rule-creation time (where it sweeps up
 * the rows already sitting in the list). Two implementations of "does this rule
 * match" would eventually disagree, and the visible symptom would be a company
 * you muted quietly coming back.
 */

export interface MuteRuleLike {
  kind: MuteRuleKind;
  pattern: string;
}

export interface MutableJob {
  title: string;
  company: string;
}

/**
 * The first rule this job trips, or null.
 *
 * Returns the rule rather than a boolean because the caller reports it — "muted
 * by your rule on Robert Half" is answerable, "hidden" is not.
 */
export function findMatchingMuteRule<Rule extends MuteRuleLike>(
  job: MutableJob,
  rules: Rule[],
): Rule | null {
  if (rules.length === 0) return null;

  const company = normalizeForMatch(job.company);
  const title = normalizeForMatch(job.title);

  for (const rule of rules) {
    const pattern = normalizeForMatch(rule.pattern).trim();
    if (pattern.length === 0) continue;

    // Same containment rule the scrapers match keywords with: a single word must
    // start on a boundary but may continue, so muting "recruit" also catches
    // "Recruiting" and "Recruiters". A multi-word pattern is matched as a plain
    // substring, which is what phrases like "robert half" want anyway.
    const haystack = rule.kind === "company" ? company : title;
    if (haystackContains(haystack, pattern)) return rule;
  }

  return null;
}

export interface MuteSplit<Job> {
  kept: Job[];
  muted: Job[];
}

/**
 * Splits scraped jobs into the ones to keep and the ones a rule silences.
 *
 * Both halves are returned because the count of what was dropped is worth
 * showing — a scrape that found forty and wrote nine looks broken unless the app
 * can say the other thirty-one were muted on purpose.
 */
export function splitMutedJobs<Job extends MutableJob>(
  scrapedJobs: Job[],
  rules: MuteRuleLike[],
): MuteSplit<Job> {
  if (rules.length === 0) return { kept: scrapedJobs, muted: [] };

  const kept: Job[] = [];
  const muted: Job[] = [];

  for (const job of scrapedJobs) {
    if (findMatchingMuteRule(job, rules)) muted.push(job);
    else kept.push(job);
  }

  return { kept, muted };
}
