# Replacing Apify with a Self-Hosted Scraper — Implementation Plan

**Date:** 2026-08-17
**Status:** Phases 1–3 implemented. Phase 4 (leads) not started.
**Note:** The audit's C1–C3 (auth bypass, IDOR, SSRF) are still open — deferred by decision, to be done next.

---

## Implementation status

| Phase | Status | Notes |
|---|---|---|
| 1 — Foundations | ✅ Done | Schema migrated, HTTP layer, provider interface, per-user source flag |
| 2 — ATS sources | ✅ Done | 6 providers + auto-detection + Companies UI |
| 3 — LinkedIn source | ✅ Done | Guest search + detail, two-pass fetch. Runs inline with a 60s budget |
| **Aggregators** | ✅ Done | 8 free keyword-searchable sources, no company list needed |
| **Freelance / client work** | ✅ Done | Freelancer.com + HN "Seeking Freelancer" |
| **Credentialed sources** | ✅ Done | Adzuna, Reddit, X — dormant until a key is saved |
| 3.5 — Queue | ⬜ Not started | Needed before LinkedIn runs at volume — see [§3.5](#35--execution--this-will-not-fit-in-a-serverless-function) |
| 4 — Hiring managers | ⬜ Not started | Still on Apify. See [Phase 4](#phase-4--hiring-manager-discovery-without-scraping-linkedin) |
| 5 — Cutover | 🟡 Partial | Apify retained for leads; jobs default to self-hosted sources |

**Verified end-to-end** against the live database: **690 real jobs** across greenhouse (577), arbeitnow (77), remoteok (29) and freelancer (7), with work types, tags, salary ranges and required attribution all persisted. Repeat runs insert 0 — dedupe holds.

### The 21 sources

| Tier | Sources | Key needed |
|---|---|---|
| Company boards | Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling | No |
| Aggregators | RemoteOK, Arbeitnow, Jobicy, The Muse, Himalayas, WeWorkRemotely, HN Who is Hiring | No |
| Freelance | Freelancer.com, HN Seeking Freelancer | No |
| Credentialed | Adzuna, Reddit, X/Twitter, SerpAPI | Yes — Settings |
| Scraped | LinkedIn guest, Apify (legacy) | No |

Company boards need a slug from your target list. Everything else searches by your criteria.

### Notes on specific sources

- **Upwork's RSS feeds are gone** (410). There is no free Upwork access; the API requires partner approval. Freelancer.com is the working substitute.
- **Indeed has no public API.** Adzuna covers similar ground with a free key and is the practical stand-in. Indeed/Glassdoor/Wellfound all serve JS shells or block datacenter IPs and would need an unblocking proxy — the `scrapingProxyProvider` setting exists for this, but no proxy-backed source is wired up yet.
- **Reddit is free** with an OAuth app (100 queries/min); the unauthenticated JSON endpoints now 403.
- **RemoteOK requires attribution** as a condition of API access — a *followed* link back. Stored per-job in `attributionText`/`attributionUrl` and rendered on the job card. Don't add `nofollow`.
- **HN threads** are parsed from the monthly "Who is Hiring" (`whoishiring`) and "Seeking Freelancer" (`jon_north`) posts. Only top-level comments are postings; replies are filtered out. The freelance source keeps only "SEEKING FREELANCER" posts — "SEEKING WORK" posts are other freelancers, not clients.

### What was built

```
src/lib/scrapers/
  job-source.types.ts          # contract, Zod boundary, lenient array parsing, dedupe
  source-registry.ts           # every source: tier, description, credential fields
  normalize-work-type.ts       # "FullTime" / "permanent" / "Vollzeit" → one enum
  http/{fetch-with-retry,rate-limiter,build-request-headers,scrape-error}.ts
  ats/{greenhouse,lever,ashby,workable,smartrecruiters,rippling,detect-ats,fetch-ats-jobs}.ts
  aggregators/{remoteok,arbeitnow,jobicy,themuse,himalayas,weworkremotely,
               hackernews,freelancer,adzuna,reddit,twitter,match-query,
               fetch-aggregator-jobs}.ts
  linkedin/{search-jobs,parse-job-card,parse-job-detail}.ts + __fixtures__/

src/scraping/                  # scrape runs
src/companies/                 # tracked companies
src/credentials/               # per-user API keys, masked on read
src/components/settings/{job-sources-section,source-credentials-section}.tsx
drizzle/000{0,1}_*.sql
```

### Two bugs the canary tests caught

Both were silent — the failure mode was "zero results", not an exception. This is the argument for the canary suite in one paragraph.

1. **One malformed record discarded an entire feed.** Arbeitnow ships roughly one record per 175 with `job_types` as an object instead of an array. Because the response was validated with `z.array(schema)` — all-or-nothing — that single record made the source return **0 of 175 jobs**. Fixed with `parseArrayLeniently`, which validates record-by-record and drops only the bad ones. The same flaw was present in all 14 adapters.
2. **Paginated feeds overlap.** New postings shift the window mid-scrape, so the same slug appears on page 1 and page 2 — 10 duplicates out of 157. Now deduped in the paginating sources, the dispatcher, and `insertJobs`.

A third bug was caught by the integration test: `insertJobs` never mapped the new `workType`, `isRemote`, `tags` and attribution columns, so every source populated them and the database silently discarded all five.

### Commands

```bash
npm test                                    # unit tests (fixtures, no network)
npm run test:canary                         # live check that selectors still match
npm run db:generate && npm run db:migrate   # schema changes
```

### Known gaps

- **The whole run shares one 60s budget**, and 21 sources is a lot to fit in it. Board and aggregator sources are fast (one request each); LinkedIn is what eats the time. Select fewer sources, or land Phase 3.5.
- **Serverless egress IPs will get rate-limited.** Himalayas already soft-rate-limits with 403 during test runs. 403 is now retried with backoff, but at volume expect to need proxies or a dedicated worker.
- **Credentials are stored in plaintext**, same as the Apify token — AUDIT.md M10. Encrypt before real users. They are at least never returned to the client: the API serves masked previews only.
- **No proxy-backed source is wired up yet.** The `scrapingProxyProvider` / `scrapingProxyApiKey` columns exist for Indeed/Glassdoor/Wellfound, but nothing reads them.
- **Apify still powers hiring-manager discovery.** Unchanged, and still the riskiest part of the system.
- **`jobs.scrape` was removed** in favour of `scraping.start`, which returns a run with progress counters.

---

---

## TL;DR

Every endpoint in this plan was tested live before writing it — results in [Appendix A](#appendix-a--verified-endpoints).

**Three findings that shape the whole design:**

1. **LinkedIn's logged-out job API still works and is cleanly parseable.** No auth, no JS, no headless browser. Stable job IDs, title, company, company URL, location, and an ISO posted-date, plus a separate endpoint for the full description. This replaces `scrapeLinkedInJobs()` entirely.

2. **ATS job boards are free, public, structured JSON — and better data than LinkedIn.** Greenhouse, Lever, Ashby, and Workable all return full job listings with no auth and no anti-bot. No ToS grey area, no proxies, no maintenance when someone changes a CSS class. This should be your *primary* source, with LinkedIn as breadth coverage.

3. **Do not rebuild LinkedIn profile scraping.** `findHiringManagers()` is the one piece you should *not* self-host. Profiles are auth-walled, it's the highest-risk part legally, and it's where accounts get banned. Replace it with a search-index + B2B-data approach instead ([Phase 4](#phase-4--hiring-manager-discovery-without-scraping-linkedin)).

**Net:** you can drop Apify for jobs with high confidence. For leads, you're swapping one vendor for a different (cheaper, more reliable) vendor — not eliminating vendors.

---

## Before you build: the honest constraints

Two things worth knowing, stated once and then I'll move on.

**Legal.** LinkedIn's User Agreement prohibits automated access. In *hiQ Labs v. LinkedIn*, the Ninth Circuit held that scraping **public** data doesn't violate the CFAA — so this isn't criminal hacking — but hiQ ultimately **lost on breach of contract** in the 2022 final ruling. Practical translation: scraping logged-out public pages is a contract issue, not a crime; scraping while logged in is materially worse on both the legal and the ban-risk axis. Never put session cookies in this scraper. Separately, hiring-manager names and headlines are personal data under GDPR — if you have EU users you owe Article 14 notice and a lawful basis. The ATS-first strategy below sidesteps most of this, which is a large part of why I'm recommending it.

**Cost.** Self-hosting is not obviously cheaper at low volume. Apify runs maybe $5–50/mo for your usage. Self-hosted is ~$0 for the ATS path, but LinkedIn at scale means residential proxies ($5–75/mo) plus your time every time a selector breaks. **The reason to do this is control and data quality, not savings** — you stop being rate-limited by a third party, you own the parse, and you can add sources Apify doesn't have. Go in with that framing.

---

## Architecture

### Source strategy — three tiers

| Tier | Source | Auth | Anti-bot | Coverage | Maintenance |
|---|---|---|---|---|---|
| **1** | ATS boards (Greenhouse, Lever, Ashby, Workable) | None | None | Deep on startups/tech | Very low — versioned JSON APIs |
| **2** | LinkedIn guest job search | None | IP rate limits | Broad | Medium — HTML selectors drift |
| **3** | Hiring managers (SERP + B2B API) | API key | N/A | Varies | Low |

Tier 1 gives you clean data for companies you target. Tier 2 gives you discovery — finding companies you didn't know were hiring. They're complementary: **use LinkedIn to discover the company, then pull the real listing from that company's ATS** where possible. You get LinkedIn's breadth with the ATS's data quality and an application URL that actually works.

### Where the code goes

Following CLAUDE.md — `lib/` for third-party wrappers, `src/{domain}/` for business logic:

```
src/lib/scrapers/
  job-source.types.ts            # JobSource interface + shared Zod schemas
  http/
    fetch-with-retry.ts          # backoff, Retry-After, circuit breaker
    rate-limiter.ts              # token bucket per host
    build-request-headers.ts     # UA pool, Accept-Language, Referer
  linkedin/
    search-jobs.ts               # guest search endpoint
    fetch-job-detail.ts          # guest detail endpoint
    parse-job-card.ts            # pure — HTML → ScrapedJob
    parse-job-detail.ts          # pure — HTML → description + criteria
    __fixtures__/                # saved real HTML for tests
  ats/
    greenhouse.ts
    lever.ts
    ashby.ts
    workable.ts
    detect-ats.ts                # careers URL → which ATS + slug

src/scraping/                    # new domain — scrape runs have DB state
  scraping.validators.ts
  scraping.db.ts                 # scrape_runs queries
  scraping.service.ts            # orchestration, source selection, fan-out
  scraping.router.ts             # start / getRunStatus / cancel
```

`src/jobs/jobs.service.ts` keeps calling one function; it just stops caring which source answered.

### The provider interface

This is the keystone — it's what lets you migrate incrementally and keep Apify as a fallback.

```ts
// src/lib/scrapers/job-source.types.ts
import { z } from "zod";

// The contract every source must satisfy. This is also the runtime validation
// boundary the audit (C4) flagged as missing — untrusted data stops here.
export const scrapedJobSchema = z.object({
  sourceJobId: z.string().min(1),      // NOT NULL — fixes the null-dedupe bug
  source: z.enum(["linkedin_guest", "greenhouse", "lever", "ashby", "workable", "apify"]),
  title: z.string().min(1),
  company: z.string().min(1),
  jobUrl: z.string().url(),
  companyUrl: z.string().url().nullable(),
  location: z.string().nullable(),
  salary: z.string().nullable(),
  description: z.string().nullable(),
  postedAt: z.coerce.date().nullable(),
});

export type ScrapedJob = z.infer<typeof scrapedJobSchema>;

export interface JobSearchQuery {
  titles: string[];
  locations: string[];
  daysPosted?: number;
  salaryMin?: number;
}

export interface JobSource {
  readonly name: ScrapedJob["source"];
  search(query: JobSearchQuery, signal: AbortSignal): AsyncGenerator<ScrapedJob>;
}
```

Two deliberate choices:

- **`AsyncGenerator`, not `Promise<ScrapedJob[]>`.** Scraping is paginated and slow. Streaming lets you persist page 1 while page 2 is in flight, so a run that dies halfway still leaves you with real jobs instead of nothing.
- **Zod at the boundary, not a cast.** `as unknown as ScrapedJob[]` is exactly the bug in the current Apify client. Every source parses through `scrapedJobSchema.safeParse` and drops malformed records instead of crashing the run on a NOT NULL violation.

---

## Phase 1 — Foundations (no scraping yet)

**Goal:** the seams and safety rails, so later phases are drop-in.

### 1.1 Schema migration

```ts
// src/lib/db/schema.ts
export const jobSourceEnum = pgEnum("job_source", [
  "linkedin_guest", "greenhouse", "lever", "ashby", "workable", "apify",
]);

export const jobs = pgTable("jobs", {
  // ...
  source: jobSourceEnum("source").notNull().default("apify"),
  sourceJobId: text("source_job_id").notNull(),   // was: apifyId (nullable)
  companyUrl: text("company_url"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("jobs_user_source_id_idx").on(table.userId, table.source, table.sourceJobId),
  index("jobs_user_processed_idx").on(table.userId, table.isProcessed),
]);
```

Making `sourceJobId` NOT NULL is what actually fixes audit finding C4 — Postgres treats NULLs as distinct in unique indexes, so the current nullable `apifyId` means `onConflictDoNothing()` never fires and every scrape duplicates every job.

New table for run tracking:

```ts
export const scrapeStatusEnum = pgEnum("scrape_status", [
  "queued", "running", "completed", "failed", "cancelled",
]);

export const scrapeRuns = pgTable("scrape_runs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: scrapeStatusEnum("status").notNull().default("queued"),
  sources: text("sources").array().notNull(),
  tasksTotal: integer("tasks_total").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsInserted: integer("jobs_inserted").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
}, (table) => [
  index("scrape_runs_user_started_idx").on(table.userId, table.startedAt),
]);
```

> Do this as a **generated migration**, not `drizzle-kit push` (audit M9). You're renaming a column on a table with data — you want that reviewable.

### 1.2 HTTP layer

```ts
// src/lib/scrapers/http/fetch-with-retry.ts
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export async function fetchWithRetry(url: string, options: FetchOptions): Promise<Response> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, { ...options, headers: buildRequestHeaders(options) });

    if (response.ok) return response;

    // Honour the server's own backoff instruction before falling back to ours
    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1_000
        : Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
      await sleep(waitMs + Math.random() * 1_000); // jitter — avoid lockstep retries
      continue;
    }

    if (response.status >= 500) {
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
      continue;
    }

    throw new ScrapeError(`${url} returned ${response.status}`, response.status);
  }
  throw new ScrapeError(`${url} failed after ${MAX_ATTEMPTS} attempts`, 0);
}
```

Plus a **circuit breaker**: 3 consecutive 429s from a host → stop the run, mark it `failed` with a clear message, don't hammer. And a token-bucket limiter capping LinkedIn at ~1 request every 2–5s with jitter.

### 1.3 Feature flag

Add `jobSources: text("job_sources").array()` to `user_settings`, defaulting to `["apify"]`. Every phase below ships dark and you flip yourself over first.

**Deliverable:** migration applied, `fetchWithRetry` + rate limiter unit-tested, nothing behaviourally changed.

---

## Phase 2 — ATS sources (highest value, lowest risk)

Start here, not with LinkedIn. Free, legal, structured, no anti-bot, and it proves the provider interface before you take on the hard target.

### 2.1 The adapters

All four verified live. Greenhouse example:

```ts
// src/lib/scrapers/ats/greenhouse.ts
const GREENHOUSE_BOARD_URL = "https://boards-api.greenhouse.io/v1/boards";

const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string(),
  absolute_url: z.string().url(),
  updated_at: z.string(),
  location: z.object({ name: z.string() }).nullable(),
  content: z.string().optional(),   // HTML, only with ?content=true
});

export async function fetchGreenhouseJobs(boardToken: string, companyName: string) {
  const response = await fetchWithRetry(
    `${GREENHOUSE_BOARD_URL}/${boardToken}/jobs?content=true`,
    { method: "GET" },
  );
  const payload = z.object({ jobs: z.array(greenhouseJobSchema) }).parse(await response.json());

  return payload.jobs.map((job) => ({
    sourceJobId: String(job.id),
    source: "greenhouse" as const,
    title: job.title,
    company: companyName,
    jobUrl: job.absolute_url,
    companyUrl: null,
    location: job.location?.name ?? null,
    salary: null,
    description: job.content ? stripHtml(job.content) : null,
    postedAt: new Date(job.updated_at),
  }));
}
```

Lever, Ashby, and Workable are the same shape against the URLs in Appendix A. Ashby returns the richest payload — `department`, `team`, `employmentType`, `secondaryLocations`, and compensation on many postings.

### 2.2 The company-discovery problem

**This is the real catch, and it's worth being upfront about it.** ATS APIs need a company slug — you can't search "all Greenhouse jobs matching React." You need to know *which* boards to poll. Four ways to get there, in order of effort:

1. **User-supplied target list.** Add a "Target Companies" section to `/criteria`. Honestly this is the best-fit feature for a job hunter anyway — people have a shortlist. Ship this first; it's a form and a table.
2. **Detect from LinkedIn results.** Every Tier-2 result gives you a company name and LinkedIn company URL. Resolve the careers page, sniff the ATS, cache the slug.
3. **Slug probing.** Normalize the company name (`Acme Corp` → `acmecorp`, `acme`, `acme-corp`) and probe each board API. A 200 means you found it; 404 costs nothing. Cache both outcomes.
4. **Public board indexes.** Community-maintained lists of Greenhouse/Lever boards exist and can seed you with thousands.

```ts
export const trackedCompanies = pgTable("tracked_companies", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  atsProvider: jobSourceEnum("ats_provider"),
  atsSlug: text("ats_slug"),
  lastCheckedAt: timestamp("last_checked_at"),
}, (table) => [uniqueIndex("tracked_companies_user_name_idx").on(table.userId, table.name)]);
```

Start with (1). Add (2) once Phase 3 lands. `detect-ats.ts` — fetch the careers page, look for `boards.greenhouse.io`, `jobs.lever.co`, `jobs.ashbyhq.com`, `apply.workable.com` in the markup — is a tidy 30-line function.

**Deliverable:** users add target companies, hit scrape, get real jobs. Apify untouched. This alone may cover a large share of what you actually want.

---

## Phase 3 — LinkedIn guest source

### 3.1 What the endpoints give you

Verified against a live response — this is the actual DOM, not a guess:

```
GET /jobs-guest/jobs/api/seeMoreJobPostings/search?keywords={q}&location={loc}&start={n}
```

Returns an HTML fragment of `<li>` cards, 10 per page, `start` paginates:

| Field | Selector |
|---|---|
| Job ID | `div.job-search-card[data-entity-urn]` → `urn:li:jobPosting:4419969671` |
| Title | `h3.base-search-card__title` |
| Company | `h4.base-search-card__subtitle a` (text) |
| Company URL | same anchor's `href` |
| Location | `span.job-search-card__location` |
| Posted | `time.job-search-card__listdate[datetime]` → `2026-07-30` |
| Job URL | `a.base-card__full-link[href]` |

```
GET /jobs-guest/jobs/api/jobPosting/{jobId}
```

| Field | Selector |
|---|---|
| Description | `div.description__text--rich` |
| Seniority / type / function / industry | `ul.description__job-criteria-list` items |

### 3.2 Parse with `linkedom`, not a browser

The response is static HTML. **No Playwright, no headless Chrome, no `@sparticuz/chromium`.** That's the single biggest cost and complexity saving in this plan. `linkedom` is fast, tiny, and serverless-safe:

```ts
// src/lib/scrapers/linkedin/parse-job-card.ts
import { parseHTML } from "linkedom";

const JOB_URN_PREFIX = "urn:li:jobPosting:";

// Pure function — HTML in, jobs out. No I/O, so it's trivially testable
// against the saved fixtures in __fixtures__/.
export function parseJobCards(html: string): unknown[] {
  const { document } = parseHTML(html);

  return [...document.querySelectorAll("div.job-search-card")].map((card) => {
    const urn = card.getAttribute("data-entity-urn") ?? "";
    const companyAnchor = card.querySelector("h4.base-search-card__subtitle a");

    return {
      sourceJobId: urn.replace(JOB_URN_PREFIX, ""),
      source: "linkedin_guest",
      title: card.querySelector("h3.base-search-card__title")?.textContent?.trim(),
      company: companyAnchor?.textContent?.trim(),
      companyUrl: stripQuery(companyAnchor?.getAttribute("href")),
      location: card.querySelector("span.job-search-card__location")?.textContent?.trim(),
      postedAt: card.querySelector("time.job-search-card__listdate")?.getAttribute("datetime"),
      jobUrl: stripQuery(card.querySelector("a.base-card__full-link")?.getAttribute("href")),
      salary: null,
      description: null,   // filled by the detail pass
    };
  });
}
```

`stripQuery` matters: LinkedIn appends per-request `refId`/`trackingId` params. Leave them on and the same job looks different every scrape, breaking dedupe and bloating the table.

### 3.3 Two-pass fetching

Never fetch details for jobs you already have. This is both the main politeness lever and the main speed lever:

```ts
// src/lib/scrapers/linkedin/search-jobs.ts
export async function* searchLinkedInJobs(query, existingIds: Set<string>, signal) {
  for (const title of query.titles) {
    for (const location of query.locations) {
      for (let start = 0; start < MAX_RESULTS_PER_QUERY; start += RESULTS_PER_PAGE) {
        if (signal.aborted) return;

        const html = await rateLimiter.schedule(() =>
          fetchWithRetry(buildSearchUrl(title, location, start), { signal }).then((r) => r.text()),
        );

        const cards = parseJobCards(html);
        if (cards.length === 0) break;   // exhausted this query

        for (const card of cards) {
          const parsed = scrapedJobSchema.omit({ description: true }).safeParse(card);
          if (!parsed.success) continue;                        // drop junk, keep going
          if (existingIds.has(parsed.data.sourceJobId)) continue; // already have it

          // Only new jobs earn a second request
          const description = await rateLimiter.schedule(() =>
            fetchJobDetail(parsed.data.sourceJobId, signal),
          );
          yield { ...parsed.data, ...description };
        }
      }
    }
  }
}
```

### 3.4 Anti-detection — realistic expectations

- **Rotate a small pool of genuine Chrome UA strings** with matching `Accept`, `Accept-Language`, `Sec-Ch-Ua` headers. Mismatched header sets are more detectable than a plain default UA.
- **1 request per 2–5s with jitter.** Fixed intervals are a fingerprint.
- **Expect Vercel to get blocked.** Serverless egress IPs are shared, well-known, and already burned by other scrapers. Two options: rotating residential proxies (Webshare is the cheap entry point, Bright Data the premium one) via `undici`'s `ProxyAgent`, or run the scraper as a small worker on Railway/Fly with a stable IP you control. **I'd run the worker.** It also solves the timeout problem in 3.5.
- **Never authenticate.** No cookies, no `li_at` token. Logged-out public data is the entire legal argument; a session cookie throws it away and adds a permanent-ban risk.
- **Cache 30–60 min.** Rerunning the same search shouldn't re-hit the network.

### 3.5 Execution — this will not fit in a serverless function

100 jobs × ~2 requests × 3s ≈ 10 minutes. Vercel caps at 60s (Pro: 300s). You need background execution.

**Recommended: QStash** — Upstash is already in your CLAUDE.md stack.

```
scraping.start (tRPC)
  └─ create scrape_run { status: queued, tasksTotal: N }
  └─ publish N QStash messages, one per (title × location) pair
        └─ POST /api/scrape/task  ← each stays well under 60s
              ├─ fetch + parse one query's pages
              ├─ upsert jobs, increment tasksCompleted
              └─ if tasksCompleted === tasksTotal → mark completed
```

Client polls `scraping.getRunStatus` every 2s and shows a real progress bar. QStash gives you retries, dead-letter, and signature verification for free.

**Alternative: Inngest** — less plumbing, step functions with automatic retry and a good local dev UI. Slightly better DX, one more vendor.

**Alternative: dedicated worker** — a small Node service on Railway/Fly polling a jobs table. Most control, stable IP for proxying, no timeout ceiling. Best long-term home for a scraper; more ops.

**Deliverable:** LinkedIn behind the flag, running in shadow mode next to Apify. Compare outputs for a week before cutting over.

---

## Phase 4 — Hiring manager discovery (without scraping LinkedIn)

**Recommendation: do not self-host this.** LinkedIn profiles are auth-walled — the guest endpoints that make Phase 3 easy have no profile equivalent. Getting them requires either a logged-in session (ban + the legal position collapses) or a commercial unblocking service (you've just re-hired Apify under a new name). And profiles are the most sensitive personal data in the whole pipeline.

Better paths, roughly in order of value:

**A. Search-index lookup (SERP API).** Query a search engine, not LinkedIn:

```
site:linkedin.com/in "VP of Engineering" "Acme Corp"
```

You get profile URLs and headline snippets from the *search index* — you never touch linkedin.com. Brave Search API (~$3–5/1k queries, generous free tier) or SerpAPI. Your existing `getManagerTitles()` title-mapping logic ports over unchanged and is genuinely the good part of the current Apify client.

**B. B2B data providers.** Apollo.io (free tier, ~275M contacts, real API), People Data Labs, RocketReach, Hunter.io for email patterns. These license their data and handle compliance — which is exactly the liability you don't want to own as a solo SaaS.

**C. Company sources — free and underrated.** `/team` and `/about` pages, GitHub org members for engineering roles, conference speaker pages, engineering blog bylines. Low coverage individually, zero cost, zero risk.

**D. Skip the manager entirely.** ATS listings frequently name the recruiter or hiring manager, and always give a direct application URL. For a lot of roles, "apply well through the front door" beats "cold-DM a VP."

Same interface pattern as jobs:

```ts
export interface LeadSource {
  readonly name: string;
  findLeads(company: string, jobTitle: string, signal: AbortSignal): Promise<ScrapedLead[]>;
}
```

Run A + C in parallel, merge on normalized name, take the highest-confidence record. Add a `confidence` score and a `source` column on `leads` so the UI can show where a person came from — users should know whether a name is verified or inferred.

---

## Phase 5 — Cutover

1. **Shadow mode.** Both pipelines write; new sources tagged in the `source` column. Compare volume and field completeness for a week.
2. **Opt-in.** Flip your own account. Then a handful of users.
3. **Default flip.** New signups default to self-hosted; Apify stays as fallback.
4. **Remove** `src/lib/apify/client.ts` and the `apify-client` dependency once the run-failure rate is stable for a month. Keep the `"apify"` enum value for historical rows.

Never delete the Apify path until self-hosted has survived a LinkedIn markup change. That's the real test.

---

## Testing — the part that decides whether this survives

Scrapers rot. LinkedIn will change their markup, probably without warning. Design for that:

**Fixture tests (the core).** Save real HTML to `__fixtures__/` and unit-test the parsers against it. Because the parsers are pure functions, this is fast and deterministic:

```ts
// parse-job-card.test.ts
it("extracts the stable job id from the entity urn", () => {
  const html = readFileSync("./__fixtures__/search-results.html", "utf-8");
  const [job] = parseJobCards(html);
  expect(job.sourceJobId).toBe("4419969671");
});

it("strips tracking params so the same job dedupes across runs", () => {
  const [job] = parseJobCards(readFileSync("./__fixtures__/search-results.html", "utf-8"));
  expect(job.jobUrl).not.toContain("refId");
});
```

**Canary test.** A daily scheduled test that hits the live endpoint and asserts the selectors still match. When LinkedIn changes their HTML you find out from a failing check, not from a user reporting zero results. This is the highest-leverage test in the whole plan.

**Contract tests.** Every source's output validates against `scrapedJobSchema`. Catches drift in the ATS APIs too.

Vitest is in your CLAUDE.md stack and isn't installed yet — this is the reason to add it.

---

## Cost comparison

| | Apify (today) | Self-hosted |
|---|---|---|
| Jobs — ATS | n/a | **$0** |
| Jobs — LinkedIn | ~$5–50/mo | $0 + proxies ($5–75/mo if needed) |
| Leads | included | SERP ~$5/mo, or Apollo free tier |
| Compute | included | $0 (QStash free tier) – $20/mo (worker) |
| **Engineering** | ~0 | **~3–5 days initial, then ongoing** |

Be honest with yourself: the money isn't the reason. The reasons are that you own the parse, you're not rate-limited by someone else's actor, ATS data is cleaner than anything Apify returns, and you can add sources on your own schedule.

---

## Suggested order

| Phase | Scope | Effort | Risk |
|---|---|---|---|
| **0** | Audit C1–C3 (auth bypass, IDOR, SSRF) | 2–3 h | — |
| **1** | Schema migration, HTTP layer, provider interface, flag | 1 day | Low |
| **2** | ATS sources + target-companies UI | 1–2 days | Low |
| **3** | LinkedIn guest source + queue | 2 days | Medium |
| **4** | Lead discovery via SERP/Apollo | 1 day | Low |
| **5** | Shadow, cutover, remove Apify | ongoing | Low |

**If you only do one thing: Phase 2.** Free, legal, no anti-bot, better data than what you have now, and it proves the whole abstraction. You may find it covers most of your actual need and LinkedIn becomes optional.

---

## Appendix A — Verified endpoints

Tested live on 2026-08-17. All unauthenticated `GET` requests.

| Source | Endpoint | Result |
|---|---|---|
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | ✅ 200 — 358 KB JSON (`stripe`) |
| Lever | `api.lever.co/v0/postings/{company}?mode=json` | ✅ 200 — 2.4 MB JSON (`leverdemo`); 404 = not on Lever |
| Ashby | `api.ashbyhq.com/posting-api/job-board/{name}` | ✅ 200 — 2.2 MB JSON, richest schema |
| Workable | `apply.workable.com/api/v1/widget/accounts/{account}?details=true` | ✅ 200 — valid shape |
| LinkedIn search | `linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=&location=&start=` | ✅ 200 — 27 KB HTML, 10 cards/page |
| LinkedIn detail | `linkedin.com/jobs-guest/jobs/api/jobPosting/{jobId}` | ✅ 200 — 67 KB HTML |

**Not tested:** sustained rate limits. I deliberately didn't hammer LinkedIn to find the 429 threshold. Establish it yourself with a slow ramp before running at volume — and assume it's per-IP and lower than you'd like.

**Caveat:** the two LinkedIn endpoints are undocumented and unversioned. They've been stable for years, but they can change or disappear without notice. That's the risk you're accepting, and it's why the canary test matters and why ATS sources should carry the primary load.
