import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getResolvedCompanies } from "@/companies/companies.db";
import { getSettingsByUserId } from "@/settings/settings.db";
import { resolveCredentials } from "@/credentials/credentials.service";
import { getExistingSourceJobIds, insertJobs } from "@/jobs/jobs.db";
import { fetchAtsJobs, isAtsProvider } from "@/lib/scrapers/ats/fetch-ats-jobs";
import {
  aggregatorNeedsCredentials,
  fetchAggregatorJobs,
  isAggregatorSource,
} from "@/lib/scrapers/aggregators/fetch-aggregator-jobs";
import { linkedInJobSource } from "@/lib/scrapers/linkedin/search-jobs";
import { getSourceDefinition } from "@/lib/scrapers/source-registry";
import type {
  JobSearchQuery,
  JobSourceName,
  ScrapedJob,
  WorkType,
} from "@/lib/scrapers/job-source.types";
import {
  cancelScrapeRun,
  finishScrapeRun,
  getLatestScrapeRun,
  getScrapeRunById,
  insertScrapeRun,
  recordTaskProgress,
} from "./scraping.db";
import type { StartScrapeInput } from "./scraping.validators";

// The run executes inside the request that starts it, so it needs a hard ceiling.
// Moving this to a queue (QStash) is what removes the limit — see docs/SCRAPER-PLAN.md.
const MAX_RUN_DURATION_MS = 60_000;
// Jobs are flushed in batches so a run that hits the budget still leaves results.
const INSERT_BATCH_SIZE = 20;

const DEFAULT_SOURCES: JobSourceName[] = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "remoteok",
  "arbeitnow",
];

export async function fetchRunStatus(db: Database, userId: string, runId: string) {
  const run = await getScrapeRunById(db, userId, runId);
  if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Scrape run not found" });
  return run;
}

export async function fetchLatestRun(db: Database, userId: string) {
  return getLatestScrapeRun(db, userId);
}

export async function cancelRun(db: Database, userId: string, runId: string) {
  const cancelled = await cancelScrapeRun(db, userId, runId);
  if (!cancelled) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No running scrape to cancel" });
  }
  return cancelled;
}

/**
 * Runs a scrape across every enabled source and returns the completed run.
 *
 * Sources are independent: one failing (LinkedIn rate-limiting us, an ATS board
 * 404ing, an expired API key) marks that task done and moves on rather than
 * losing the whole run.
 */
export async function startScrape(db: Database, userId: string, input: StartScrapeInput) {
  const [activeCriteria, settings, companies] = await Promise.all([
    getActiveCriteria(db, userId),
    getSettingsByUserId(db, userId),
    getResolvedCompanies(db, userId),
  ]);

  const sources = resolveSources(input.sources, settings?.jobSources);
  const boardSources = sources.filter(isAtsProvider);
  const aggregatorSources = sources.filter(isAggregatorSource);
  const wantsLinkedIn = sources.includes("linkedin_guest");

  const companiesInScope = companies.filter(
    (company) =>
      company.atsProvider &&
      company.atsSlug &&
      boardSources.includes(company.atsProvider as never),
  );

  // Aggregators and LinkedIn both search by keyword, so they need criteria.
  const needsCriteria = wantsLinkedIn || aggregatorSources.length > 0;
  if (needsCriteria && !activeCriteria) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active criteria found. Set up your search criteria first.",
    });
  }

  const tasksTotal =
    companiesInScope.length + aggregatorSources.length + (wantsLinkedIn ? 1 : 0);

  if (tasksTotal === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Nothing to scrape. Add target companies, or enable an aggregator source in Settings.",
    });
  }

  const query: JobSearchQuery = {
    titles: activeCriteria?.titles ?? [],
    locations: activeCriteria?.locations ?? [],
    salaryMin: activeCriteria?.salaryMin ?? undefined,
    workTypes: (input.workTypes as WorkType[] | undefined) ?? undefined,
  };

  const run = await insertScrapeRun(db, userId, { sources, tasksTotal });

  const abortController = new AbortController();
  const budgetTimer = setTimeout(() => abortController.abort(), MAX_RUN_DURATION_MS);

  try {
    for (const company of companiesInScope) {
      await runBoardTask(db, userId, run.id, company, abortController.signal);
    }

    for (const source of aggregatorSources) {
      await runAggregatorTask(db, userId, run.id, source, query, abortController.signal);
    }

    if (wantsLinkedIn && activeCriteria) {
      const existingSourceJobIds = await getExistingSourceJobIds(db, userId);
      await runLinkedInTask(db, userId, run.id, query, existingSourceJobIds, abortController.signal);
    }

    // Hitting the time budget isn't a failure — everything found before the cutoff
    // was persisted. Say so explicitly so the user knows there's more to fetch.
    return finishScrapeRun(db, run.id, {
      status: "completed",
      errorMessage: abortController.signal.aborted
        ? "Stopped at the time limit — run again to continue where this left off."
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scrape failed";
    await finishScrapeRun(db, run.id, { status: "failed", errorMessage: message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  } finally {
    clearTimeout(budgetTimer);
  }
}

async function runBoardTask(
  db: Database,
  userId: string,
  runId: string,
  company: { name: string; atsProvider: string | null; atsSlug: string | null },
  signal: AbortSignal,
) {
  if (signal.aborted || !company.atsProvider || !company.atsSlug) {
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
    return;
  }

  try {
    if (!isAtsProvider(company.atsProvider)) throw new Error("Unsupported ATS provider");

    const scraped = await fetchAtsJobs(company.atsProvider, company.atsSlug, company.name, signal);
    const inserted = await insertJobs(db, userId, scraped);

    await recordTaskProgress(db, runId, {
      jobsFound: scraped.length,
      jobsInserted: inserted.length,
    });
  } catch {
    // A board that's moved or gone shouldn't sink the run.
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
  }
}

async function runAggregatorTask(
  db: Database,
  userId: string,
  runId: string,
  source: JobSourceName,
  query: JobSearchQuery,
  signal: AbortSignal,
) {
  if (signal.aborted) {
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
    return;
  }

  try {
    // A credentialed source with no key saved is skipped silently — that's a
    // configuration state, not a failure worth surfacing as an error.
    const credentials = aggregatorNeedsCredentials(source)
      ? await resolveCredentials(db, userId, source)
      : null;

    const scraped = await fetchAggregatorJobs(source, query, credentials, signal);
    const inserted = await insertJobs(db, userId, scraped);

    await recordTaskProgress(db, runId, {
      jobsFound: scraped.length,
      jobsInserted: inserted.length,
    });
  } catch {
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
  }
}

async function runLinkedInTask(
  db: Database,
  userId: string,
  runId: string,
  query: JobSearchQuery,
  existingSourceJobIds: Set<string>,
  signal: AbortSignal,
) {
  let found = 0;
  let inserted = 0;
  let batch: ScrapedJob[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const written = await insertJobs(db, userId, batch);
    inserted += written.length;
    batch = [];
  };

  try {
    const stream = linkedInJobSource.search(query, { existingSourceJobIds, signal });

    for await (const job of stream) {
      found++;
      batch.push(job);
      if (batch.length >= INSERT_BATCH_SIZE) await flush();
    }
  } finally {
    // Always persist the partial batch, including when the budget aborts the run.
    await flush();
    await recordTaskProgress(db, runId, { jobsFound: found, jobsInserted: inserted });
  }
}

// Explicit request wins, then the user's configured sources, then a safe default.
function resolveSources(
  requested: JobSourceName[] | undefined,
  configured: string[] | undefined,
): JobSourceName[] {
  const candidates = requested?.length
    ? requested
    : configured?.length
      ? (configured as JobSourceName[])
      : DEFAULT_SOURCES;

  // Drop anything the registry doesn't know about, so a stale value left in
  // user_settings can't break a run.
  return candidates.filter((source) => getSourceDefinition(source) !== null);
}
