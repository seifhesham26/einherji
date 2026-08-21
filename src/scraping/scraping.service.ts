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
import { matchesQuery } from "@/lib/scrapers/aggregators/match-query";
import { getSourceDefinition } from "@/lib/scrapers/source-registry";
import { requireBucket } from "@/buckets/buckets.service";
import { consumeQuota } from "@/usage/usage.service";
import type {
  JobSearchQuery,
  JobSourceName,
  ScrapedJob,
  WorkType,
} from "@/lib/scrapers/job-source.types";
import { isUniqueViolation } from "@/utils/is-unique-violation";
import {
  cancelScrapeRun,
  failStaleRun,
  finishScrapeRunIfRunning,
  getLatestScrapeRun,
  getScrapeRunById,
  getScrapeRunStatus,
  insertScrapeRun,
  recordTaskProgress,
} from "./scraping.db";
import type { StartScrapeInput } from "./scraping.validators";

// The run executes inside the request that starts it, so it needs a hard ceiling.
// Moving this to a queue (QStash) is what removes the limit — see docs/SCRAPER-PLAN.md.
const MAX_RUN_DURATION_MS = 60_000;
// Jobs are flushed in batches so a run that hits the budget still leaves results.
const INSERT_BATCH_SIZE = 20;
// Past this, a run still marked "running" is assumed dead rather than slow — the
// serverless process it started in is long gone. Generous multiple of the budget
// so a genuinely slow run is never killed out from under itself.
const STALE_RUN_AFTER_MS = MAX_RUN_DURATION_MS * 5;
// Only the first few failures go in the summary; beyond that it's noise.
const MAX_REPORTED_ERRORS = 3;

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
  await assertNoRunInFlight(db, userId);

  const [activeCriteria, settings, companies] = await Promise.all([
    getActiveCriteria(db, userId),
    getSettingsByUserId(db, userId),
    getResolvedCompanies(db, userId),
  ]);

  // A bucket carries its own search. When one is named it replaces the
  // account-level criteria entirely — "React Developer" and "engineering firms in
  // Cairo" are different hunts and must not share a keyword list.
  const bucket = input.bucketId ? await requireBucket(db, userId, input.bucketId) : null;

  // An empty source list on a bucket is a decision, not an omission: the paper
  // factory and supplier buckets are fed by hand because no automated source is
  // available or permitted. Falling back to the account defaults here would file
  // software job listings under them, which is worse than doing nothing.
  if (bucket && bucket.sources.length === 0 && !input.sources?.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `"${bucket.name}" has no automated sources — it's a hand-built list. Add contacts with Leads → Find businesses or Import list, or edit the bucket and pick sources for it.`,
    });
  }

  const sources = resolveSources(
    input.sources ?? (bucket ? (bucket.sources as JobSourceName[]) : undefined),
    settings?.jobSources,
  );
  const boardSources = sources.filter(isAtsProvider);
  const aggregatorSources = sources.filter(isAggregatorSource);
  const wantsLinkedIn = sources.includes("linkedin_guest");

  const companiesInScope = companies.filter(
    (company) =>
      company.atsProvider &&
      company.atsSlug &&
      boardSources.includes(company.atsProvider as never),
  );

  // Aggregators and LinkedIn both search by keyword, so they need one from
  // somewhere — the bucket if there is one, otherwise the account's criteria.
  const keywords = bucket ? bucket.keywords : (activeCriteria?.titles ?? []);
  const needsKeywords = wantsLinkedIn || aggregatorSources.length > 0;

  if (needsKeywords && keywords.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: bucket
        ? `"${bucket.name}" has no keywords yet. Add some so there's something to search for.`
        : "No active criteria found. Set up your search criteria first.",
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

  // Charged here rather than at the top: everything above this point is
  // validation that makes no external call, so rejecting a misconfigured bucket
  // shouldn't cost the account one of its fifty daily scrapes. It is still
  // charged *before* the work — a run that fails halfway has still hit the
  // boards, and a retry loop must not be free.
  await consumeQuota(db, userId, "scrape");

  const query: JobSearchQuery = {
    titles: keywords,
    locations: bucket ? bucket.locations : (activeCriteria?.locations ?? []),
    salaryMin: bucket ? undefined : (activeCriteria?.salaryMin ?? undefined),
    workTypes: (input.workTypes as WorkType[] | undefined) ?? undefined,
  };

  // Backstop for the race the check above can't win: two clicks land close enough
  // together that both read "nothing running" before either inserts.
  const run = await insertScrapeRun(db, userId, { sources, tasksTotal }).catch((error) => {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A scrape is already running. Wait for it to finish, or cancel it first.",
      });
    }
    throw error;
  });

  const abortController = new AbortController();
  const budgetTimer = setTimeout(() => abortController.abort(), MAX_RUN_DURATION_MS);
  const taskErrors: string[] = [];

  // Cancelling writes "cancelled" to the row from a different request; this is how
  // the loop notices. Without it a cancel only changed the row until this run
  // finished and overwrote it, while the scraping carried on regardless.
  const wasCancelled = async () => {
    if ((await getScrapeRunStatus(db, run.id)) !== "cancelled") return false;
    abortController.abort();
    return true;
  };

  try {
    for (const company of companiesInScope) {
      if (await wasCancelled()) return getScrapeRunById(db, userId, run.id);
      await runBoardTask(db, userId, run.id, company, query, bucket?.id ?? null, abortController.signal, taskErrors);
    }

    for (const source of aggregatorSources) {
      if (await wasCancelled()) return getScrapeRunById(db, userId, run.id);
      await runAggregatorTask(
        db,
        userId,
        run.id,
        source,
        query,
        bucket?.id ?? null,
        abortController.signal,
        taskErrors,
      );
    }

    // Gated on activeCriteria until now, while tasksTotal counted it regardless —
    // so a bucket-driven run on an account with no saved criteria skipped the
    // task without recording it, and the progress bar sat at 5/6 forever. The
    // task only ever needed `query`, which the bucket already supplies.
    if (wantsLinkedIn) {
      if (await wasCancelled()) return getScrapeRunById(db, userId, run.id);
      const existingSourceJobIds = await getExistingSourceJobIds(db, userId, "linkedin_guest");
      await runLinkedInTask(db, userId, run.id, query, existingSourceJobIds, bucket?.id ?? null, abortController.signal);
    }

    // Hitting the time budget isn't a failure — everything found before the cutoff
    // was persisted. Say so explicitly so the user knows there's more to fetch.
    return finishScrapeRunIfRunning(db, run.id, {
      status: "completed",
      errorMessage: summariseOutcome(abortController.signal.aborted, taskErrors),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scrape failed";
    await finishScrapeRunIfRunning(db, run.id, { status: "failed", errorMessage: message });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  } finally {
    clearTimeout(budgetTimer);
  }
}

// Two scrapes at once means double the requests to the same boards from the same
// IP — the fastest way to get blocked — and double the spend on metered sources.
async function assertNoRunInFlight(db: Database, userId: string) {
  const latest = await getLatestScrapeRun(db, userId);
  if (latest?.status !== "running") return;

  const startedAt = latest.startedAt?.getTime() ?? 0;
  if (Date.now() - startedAt < STALE_RUN_AFTER_MS) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A scrape is already running. Wait for it to finish, or cancel it first.",
    });
  }

  await failStaleRun(db, latest.id);
}

/**
 * Turns the run's outcome into one line for the user.
 *
 * Failures used to be swallowed whole, which meant a broken adapter was
 * indistinguishable from a board with no openings — both showed zero jobs and no
 * error. Two real bugs hid behind exactly that.
 */
function summariseOutcome(hitTimeBudget: boolean, taskErrors: string[]): string | null {
  const parts: string[] = [];

  if (hitTimeBudget) {
    parts.push("Stopped at the time limit — run again to continue where this left off.");
  }

  if (taskErrors.length > 0) {
    const shown = taskErrors.slice(0, MAX_REPORTED_ERRORS).join("; ");
    const remaining = taskErrors.length - MAX_REPORTED_ERRORS;
    parts.push(
      `${taskErrors.length} source${taskErrors.length === 1 ? "" : "s"} failed: ${shown}` +
        (remaining > 0 ? ` (and ${remaining} more)` : ""),
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function describeError(label: string, error: unknown): string {
  return `${label} — ${error instanceof Error ? error.message : "unknown error"}`;
}

async function runBoardTask(
  db: Database,
  userId: string,
  runId: string,
  company: { name: string; atsProvider: string | null; atsSlug: string | null },
  query: JobSearchQuery,
  bucketId: string | null,
  signal: AbortSignal,
  taskErrors: string[],
) {
  if (signal.aborted || !company.atsProvider || !company.atsSlug) {
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
    return;
  }

  try {
    if (!isAtsProvider(company.atsProvider)) throw new Error("Unsupported ATS provider");

    const scraped = await fetchAtsJobs(company.atsProvider, company.atsSlug, company.name, signal);

    // An ATS board returns the company's entire careers page — Stripe's Greenhouse
    // alone is several hundred roles across every department. Aggregators have
    // always filtered on the user's criteria; boards did not, so tracking one
    // large company buried every other source in noise.
    const relevant = scraped.filter((job) => matchesQuery(job, query));
    const inserted = await insertJobs(db, userId, relevant, bucketId);

    await recordTaskProgress(db, runId, {
      jobsFound: relevant.length,
      jobsInserted: inserted.length,
    });
  } catch (error) {
    // A board that's moved or gone shouldn't sink the run — but the reason has to
    // reach the user, or a broken board looks exactly like an empty one.
    taskErrors.push(describeError(company.name, error));
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
  }
}

async function runAggregatorTask(
  db: Database,
  userId: string,
  runId: string,
  source: JobSourceName,
  query: JobSearchQuery,
  bucketId: string | null,
  signal: AbortSignal,
  taskErrors: string[],
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
    const inserted = await insertJobs(db, userId, scraped, bucketId);

    await recordTaskProgress(db, runId, {
      jobsFound: scraped.length,
      jobsInserted: inserted.length,
    });
  } catch (error) {
    taskErrors.push(describeError(getSourceDefinition(source)?.name ?? source, error));
    await recordTaskProgress(db, runId, { jobsFound: 0, jobsInserted: 0 });
  }
}

async function runLinkedInTask(
  db: Database,
  userId: string,
  runId: string,
  query: JobSearchQuery,
  existingSourceJobIds: Set<string>,
  bucketId: string | null,
  signal: AbortSignal,
) {
  let found = 0;
  let inserted = 0;
  let batch: ScrapedJob[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const written = await insertJobs(db, userId, batch, bucketId);
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
  // user_settings can't break a run. Deduped too: a repeated source would be
  // counted twice in tasksTotal and scraped twice for nothing.
  return [...new Set(candidates)].filter((source) => getSourceDefinition(source) !== null);
}
