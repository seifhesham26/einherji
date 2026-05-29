# 02 — Apify Integration

## Actors You'll Use
| Actor | Purpose | Apify ID |
|---|---|---|
| LinkedIn Jobs Scraper | Find matching job postings | `curious_coder/linkedin-jobs-scraper` |
| LinkedIn Profile Scraper | Find hiring managers | `curious_coder/linkedin-profile-scraper` |
| LinkedIn Company Scraper | Get company details | `curious_coder/linkedin-company-scraper` |

---

## Setup
```bash
npm install apify-client
```

---

## `src/lib/apify/client.ts`

```ts
import { ApifyClient } from "apify-client";

export const apify = new ApifyClient({
  token: process.env.APIFY_API_TOKEN!,
});

// ─── Scrape Jobs ──────────────────────────────────────────────────────────────

export interface ScrapeJobsInput {
  titles: string[];
  locations: string[];
  companySizeMin?: number;
  companySizeMax?: number;
  salaryMin?: number;
  industries?: string[];
  daysPosted?: number; // default: 7
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

export async function scrapeLinkedInJobs(input: ScrapeJobsInput): Promise<ScrapedJob[]> {
  const run = await apify.actor("curious_coder/linkedin-jobs-scraper").call({
    searchTerms: input.titles,
    location: input.locations.join(", "),
    dateSincePosted: `past ${input.daysPosted ?? 7} days`,
    companySize: buildCompanySizeFilter(input.companySizeMin, input.companySizeMax),
    salary: input.salaryMin ? `${input.salaryMin}+` : undefined,
    industry: input.industries?.join(","),
    maxResults: 100,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items as ScrapedJob[];
}

// ─── Find Hiring Managers ─────────────────────────────────────────────────────

export interface FindManagersInput {
  company: string;
  targetTitles: string[]; // e.g. ["VP Marketing", "Director Marketing", "Head of Marketing"]
  location?: string;
  limit?: number;
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

export async function findHiringManagers(input: FindManagersInput): Promise<ScrapedProfile[]> {
  const searchQuery = input.targetTitles
    .map((t) => `"${t}"`)
    .join(" OR ");

  const run = await apify.actor("curious_coder/linkedin-profile-scraper").call({
    searchQuery: `(${searchQuery}) at ${input.company}`,
    companyName: input.company,
    location: input.location,
    limit: input.limit ?? 5,
  });

  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items as ScrapedProfile[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCompanySizeFilter(min?: number, max?: number): string {
  if (!min && !max) return "";
  if (min === 50 && max === 200) return "B";   // LinkedIn filter codes
  if (min === 201 && max === 500) return "C";
  if (min === 501 && max === 1000) return "D";
  if (min === 1001) return "E,F";
  return "";
}
```

---

## API Route — Trigger Job Scrape
### `src/app/api/apify/scrape-jobs/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, criteria } from "@/lib/db/schema";
import { scrapeLinkedInJobs } from "@/lib/apify/client";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    // Get active criteria
    const [activeCriteria] = await db
      .select()
      .from(criteria)
      .where(eq(criteria.isActive, true))
      .limit(1);

    if (!activeCriteria) {
      return NextResponse.json({ error: "No active criteria found" }, { status: 400 });
    }

    // Run Apify scrape
    const scraped = await scrapeLinkedInJobs({
      titles: activeCriteria.titles,
      locations: activeCriteria.locations,
      companySizeMin: activeCriteria.companySizeMin ?? undefined,
      companySizeMax: activeCriteria.companySizeMax ?? undefined,
      salaryMin: activeCriteria.salaryMin ?? undefined,
      industries: activeCriteria.industries ?? undefined,
    });

    // Save to DB (skip duplicates)
    const inserted = await db
      .insert(jobs)
      .values(
        scraped.map((job) => ({
          apifyId: job.id,
          title: job.title,
          company: job.company,
          companySize: job.companySize,
          location: job.location,
          salary: job.salary,
          description: job.description,
          jobUrl: job.jobUrl,
          postedAt: job.postedAt ? new Date(job.postedAt) : null,
        }))
      )
      .onConflictDoNothing()
      .returning();

    return NextResponse.json({ inserted: inserted.length, total: scraped.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

---

## API Route — Find Hiring Managers
### `src/app/api/apify/find-managers/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, leads } from "@/lib/db/schema";
import { findHiringManagers } from "@/lib/apify/client";
import { eq } from "drizzle-orm";

// Determines what title to search for based on the job title
function getManagerTitles(jobTitle: string): string[] {
  const lower = jobTitle.toLowerCase();

  if (lower.includes("engineer") || lower.includes("developer")) {
    return ["Engineering Manager", "VP Engineering", "CTO", "Head of Engineering", "Director of Engineering"];
  }
  if (lower.includes("marketing")) {
    return ["VP Marketing", "Director of Marketing", "Head of Marketing", "CMO", "Marketing Director"];
  }
  if (lower.includes("design")) {
    return ["Head of Design", "VP Design", "Design Director", "Chief Design Officer"];
  }
  if (lower.includes("product")) {
    return ["VP Product", "Head of Product", "Chief Product Officer", "Director of Product"];
  }
  if (lower.includes("sales")) {
    return ["VP Sales", "Head of Sales", "Sales Director", "Chief Revenue Officer"];
  }

  // Generic fallback
  return ["VP", "Director", "Head of", "Manager"];
}

export async function POST(req: Request) {
  const { jobId } = await req.json();

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const managerTitles = getManagerTitles(job.title);

  const profiles = await findHiringManagers({
    company: job.company,
    targetTitles: managerTitles,
    limit: 5,
  });

  const inserted = await db
    .insert(leads)
    .values(
      profiles.map((p) => ({
        jobId: job.id,
        firstName: p.firstName,
        lastName: p.lastName,
        title: p.title,
        company: p.company,
        linkedinUrl: p.linkedinUrl,
        headline: p.headline,
        about: p.about,
      }))
    )
    .returning();

  // Mark job as processed
  await db.update(jobs).set({ isProcessed: true }).where(eq(jobs.id, jobId));

  return NextResponse.json({ leads: inserted });
}
```
