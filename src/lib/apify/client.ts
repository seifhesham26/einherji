import { ApifyClient } from "apify-client";
import { z } from "zod";
import { parseArrayLeniently } from "@/lib/scrapers/job-source.types";

// LinkedIn *profiles* are auth-walled with no logged-out equivalent, so this one
// path still runs on Apify. Job scraping moved to the self-hosted scraper — see
// docs/SCRAPER-PLAN.md.

export const MAX_MANAGERS_PER_JOB = 5;

const MANAGER_TITLE_MAP: Record<string, string[]> = {
  engineer: ["Engineering Manager", "VP Engineering", "CTO", "Head of Engineering", "Director of Engineering"],
  developer: ["Engineering Manager", "VP Engineering", "CTO", "Head of Engineering", "Director of Engineering"],
  marketing: ["VP Marketing", "Director of Marketing", "Head of Marketing", "CMO"],
  design: ["Head of Design", "VP Design", "Design Director", "Chief Design Officer"],
  product: ["VP Product", "Head of Product", "Chief Product Officer", "Director of Product"],
  sales: ["VP Sales", "Head of Sales", "Sales Director", "Chief Revenue Officer"],
};

const GENERIC_MANAGER_TITLES = ["VP", "Director", "Head of", "Manager"];

export interface ScrapedProfile {
  firstName: string;
  lastName: string | null;
  title: string | null;
  company: string;
  linkedinUrl: string | null;
  headline: string | null;
  about: string | null;
}

// ─── Response validation ──────────────────────────────────────────────────────
//
// The actor's output schema has never been verified against a real run, and it
// belongs to a third party who can change it without telling us (AUDIT C4). The
// old code cast the response with `as unknown as`, so a renamed field became
// `undefined`, then a NOT NULL violation deep inside insertLeads — a 500 with a
// Postgres error, from a scraper change nobody here made.
//
// Parsing instead means a shape we don't recognise produces "no managers found"
// and a clear message, which is a true statement either way.

const optionalText = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((value) => {
    const trimmed = value === null || value === undefined ? "" : String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const apifyProfileSchema = z
  .object({
    firstName: optionalText,
    lastName: optionalText,
    // Some profile actors return only a combined name.
    fullName: optionalText,
    name: optionalText,
    title: optionalText,
    jobTitle: optionalText,
    company: optionalText,
    companyName: optionalText,
    linkedinUrl: optionalText,
    profileUrl: optionalText,
    url: optionalText,
    headline: optionalText,
    about: optionalText,
    summary: optionalText,
  })
  .partial()
  .transform((raw) => {
    const [derivedFirst, ...derivedRest] = (raw.fullName ?? raw.name ?? "").split(/\s+/);

    return {
      firstName: raw.firstName ?? derivedFirst ?? null,
      lastName: raw.lastName ?? (derivedRest.length > 0 ? derivedRest.join(" ") : null),
      title: raw.title ?? raw.jobTitle ?? null,
      company: raw.company ?? raw.companyName ?? null,
      linkedinUrl: raw.linkedinUrl ?? raw.profileUrl ?? raw.url ?? null,
      headline: raw.headline ?? null,
      about: raw.about ?? raw.summary ?? null,
    };
  })
  // firstName and company are both NOT NULL on the leads table, but only the
  // name has to come from the actor — the company is the one we searched for, so
  // it's always available as a fallback below. A record with no usable name
  // can't be stored at all, so it's dropped here rather than failing the insert.
  .refine((profile): profile is typeof profile & { firstName: string } =>
    Boolean(profile.firstName),
  );

export class ApifyResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApifyResponseError";
  }
}

// Per-account only. There is deliberately no server-wide fallback: Apify bills
// per run, so a shared token means one account's searches spend another's
// credits — silently, because it would look like it was working.
function createApifyClient(userToken?: string | null): ApifyClient {
  if (!userToken) {
    throw new Error(
      "No Apify API token found. Add your key in Settings → Integrations to enable hiring-manager search."
    );
  }
  return new ApifyClient({ token: userToken });
}

export async function findHiringManagers(
  company: string,
  jobTitle: string,
  location?: string,
  apifyToken?: string | null,
): Promise<ScrapedProfile[]> {
  const apify = createApifyClient(apifyToken);
  const targetTitles = getManagerTitles(jobTitle);
  const searchQuery = targetTitles.map((title) => `"${title}"`).join(" OR ");

  const run = await apify.actor("curious_coder/linkedin-profile-scraper").call({
    searchQuery: `(${searchQuery}) at ${company}`,
    companyName: company,
    location,
    limit: MAX_MANAGERS_PER_JOB,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  const profiles = parseArrayLeniently(items, apifyProfileSchema);

  // Every record failing while the actor returned data means its output shape
  // changed. Say that plainly — the alternative is a silent zero that looks
  // identical to "this company has no hiring managers on LinkedIn".
  if (profiles.length === 0 && items.length > 0) {
    throw new ApifyResponseError(
      `The LinkedIn profile scraper returned ${items.length} result(s) in a format this app doesn't recognise. The actor's output schema has probably changed.`,
    );
  }

  return profiles.map((profile) => ({
    ...profile,
    // The company we searched for is more reliable than whatever the profile
    // lists, which is often a former employer.
    company: profile.company || company,
  }));
}

export function getManagerTitles(jobTitle: string): string[] {
  const lower = jobTitle.toLowerCase();
  for (const [keyword, titles] of Object.entries(MANAGER_TITLE_MAP)) {
    if (lower.includes(keyword)) return titles;
  }
  return GENERIC_MANAGER_TITLES;
}
