import { ApifyClient } from "apify-client";
import { env } from "@/lib/env";

export const apify = new ApifyClient({ token: env.APIFY_API_TOKEN });

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_JOBS_PER_SCRAPE = 100;
export const MAX_MANAGERS_PER_JOB = 5;

const COMPANY_SIZE_FILTERS: Record<string, string> = {
  "50-200": "B",
  "201-500": "C",
  "501-1000": "D",
  "1001+": "E,F",
};

// Maps job title keywords → likely hiring manager titles to search for
const MANAGER_TITLE_MAP: Record<string, string[]> = {
  engineer: ["Engineering Manager", "VP Engineering", "CTO", "Head of Engineering", "Director of Engineering"],
  developer: ["Engineering Manager", "VP Engineering", "CTO", "Head of Engineering", "Director of Engineering"],
  marketing: ["VP Marketing", "Director of Marketing", "Head of Marketing", "CMO"],
  design: ["Head of Design", "VP Design", "Design Director", "Chief Design Officer"],
  product: ["VP Product", "Head of Product", "Chief Product Officer", "Director of Product"],
  sales: ["VP Sales", "Head of Sales", "Sales Director", "Chief Revenue Officer"],
};

const GENERIC_MANAGER_TITLES = ["VP", "Director", "Head of", "Manager"];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapeJobsInput {
  titles: string[];
  locations: string[];
  companySizeMin?: number;
  companySizeMax?: number;
  salaryMin?: number;
  industries?: string[];
  daysPosted?: number;
}

export interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  companySize: string;
  location: string;
  salary: string;
  description: string;
  jobUrl: string;
  postedAt: string;
}

export interface ScrapedProfile {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  linkedinUrl: string;
  headline: string;
  about: string;
}

// ─── Functions ────────────────────────────────────────────────────────────────

export async function scrapeLinkedInJobs(input: ScrapeJobsInput): Promise<ScrapedJob[]> {
  const run = await apify.actor("curious_coder/linkedin-jobs-scraper").call({
    searchTerms: input.titles,
    location: input.locations.join(", "),
    dateSincePosted: `past ${input.daysPosted ?? 7} days`,
    companySize: buildCompanySizeFilter(input.companySizeMin, input.companySizeMax),
    salary: input.salaryMin ? `${input.salaryMin}+` : undefined,
    industry: input.industries?.join(","),
    maxResults: MAX_JOBS_PER_SCRAPE,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items as unknown as ScrapedJob[];
}

export async function findHiringManagers(company: string, jobTitle: string, location?: string): Promise<ScrapedProfile[]> {
  const targetTitles = getManagerTitles(jobTitle);
  const searchQuery = targetTitles.map((title) => `"${title}"`).join(" OR ");

  const run = await apify.actor("curious_coder/linkedin-profile-scraper").call({
    searchQuery: `(${searchQuery}) at ${company}`,
    companyName: company,
    location,
    limit: MAX_MANAGERS_PER_JOB,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items as unknown as ScrapedProfile[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getManagerTitles(jobTitle: string): string[] {
  const lower = jobTitle.toLowerCase();
  for (const [keyword, titles] of Object.entries(MANAGER_TITLE_MAP)) {
    if (lower.includes(keyword)) return titles;
  }
  return GENERIC_MANAGER_TITLES;
}

function buildCompanySizeFilter(min?: number, max?: number): string {
  if (!min && !max) return "";
  if (min === 50 && max === 200) return COMPANY_SIZE_FILTERS["50-200"];
  if (min === 201 && max === 500) return COMPANY_SIZE_FILTERS["201-500"];
  if (min === 501 && max === 1000) return COMPANY_SIZE_FILTERS["501-1000"];
  if (min && min > 1000) return COMPANY_SIZE_FILTERS["1001+"];
  return "";
}
