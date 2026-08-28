import { and, count, eq, desc, asc, gte, inArray, isNull, or, ilike, sql, type SQL } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { jobEvents, jobs } from "@/lib/db/schema";
import { dedupeBySourceJobId, type ScrapedJob } from "@/lib/scrapers/job-source.types";
import type { JobSearchQuery } from "@/lib/scrapers/job-source.types";
import { scoreJob } from "./score-job";
import { buildDedupeKey } from "./build-dedupe-key";
import { UNSCORED_SORTS_LAST, decodeJobCursor, encodeJobCursor } from "./job-cursor";
import {
  OPEN_JOB_STATUSES,
  TERMINAL_JOB_STATUSES,
  type GetJobsInput,
  type JobDismissReason,
  type JobSort,
  type JobStatus,
} from "./jobs.validators";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Reading ──────────────────────────────────────────────────────────────────

/**
 * The value the list is ordered by, per sort.
 *
 * COALESCE rather than NULLS LAST because the keyset comparison below is a row
 * value, and row values have no way to express a null-ordering clause. Folding
 * the null into a real sentinel makes both the ORDER BY and the cursor agree
 * without a special case — and they have to agree exactly, or a page boundary
 * either repeats a row or skips one.
 */
function sortExpression(sort: JobSort): SQL {
  if (sort === "score") return sql`coalesce(${jobs.score}, ${UNSCORED_SORTS_LAST})`;
  // Plenty of sources never give a posting date. Falling back to when we first
  // saw it is the closest honest answer, and it keeps every row orderable.
  return sql`coalesce(${jobs.postedAt}, ${jobs.createdAt})`;
}

function isAscending(sort: JobSort): boolean {
  return sort === "oldest";
}

/**
 * The "everything after this row" predicate.
 *
 * Written as a row-value comparison, which is one index-friendly expression
 * rather than the three-way OR the same logic needs spelled out.
 */
function cursorCondition(cursor: string, sort: JobSort): SQL | null {
  const position = decodeJobCursor(cursor, sort);
  if (!position) return null;

  const expression = sortExpression(sort);

  if (sort === "score") {
    const score = Number.parseInt(position.value, 10);
    return sql`(${expression}, ${jobs.id}) < (${score}::integer, ${position.id}::text)`;
  }

  return isAscending(sort)
    ? sql`(${expression}, ${jobs.id}) > (${position.value}::timestamp, ${position.id}::text)`
    : sql`(${expression}, ${jobs.id}) < (${position.value}::timestamp, ${position.id}::text)`;
}

function buildJobFilters(userId: string, input: Omit<GetJobsInput, "limit" | "cursor" | "sort">): SQL[] {
  const conditions: SQL[] = [eq(jobs.userId, userId)];

  if (input.bucketId) conditions.push(eq(jobs.bucketId, input.bucketId));

  // No explicit status means "everything still live". Dismissed and rejected
  // rows stay in the database — they're the only record that a decision was
  // made — but they are not what the page is for.
  conditions.push(inArray(jobs.status, input.statuses ?? OPEN_JOB_STATUSES));

  if (input.sources?.length) conditions.push(inArray(jobs.source, input.sources));
  if (input.workTypes?.length) conditions.push(inArray(jobs.workType, input.workTypes));
  if (input.isRemote !== undefined) conditions.push(eq(jobs.isRemote, input.isRemote));
  if (input.minScore !== undefined) conditions.push(gte(jobs.score, input.minScore));
  if (input.postedWithinDays !== undefined) {
    // Resolved here rather than in the client so a saved view's "this week"
    // stays this week — the alternative is a stored date that quietly ages.
    const postedAfter = new Date(Date.now() - input.postedWithinDays * MILLISECONDS_PER_DAY);
    conditions.push(sql`coalesce(${jobs.postedAt}, ${jobs.createdAt}) >= ${postedAfter}`);
  }

  if (input.search) {
    // Escaped so a user searching for "100%" doesn't match every row — the
    // wildcards are ours to add, not theirs.
    const pattern = `%${escapeLikePattern(input.search)}%`;
    conditions.push(
      or(ilike(jobs.title, pattern), ilike(jobs.company, pattern)) as SQL,
    );
  }

  return conditions;
}

function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export interface JobsPage {
  jobs: (typeof jobs.$inferSelect)[];
  /** Null when this was the last page. */
  nextCursor: string | null;
}

/**
 * One page of jobs, filtered and ordered in the database.
 *
 * This used to select every row a user had and hand the whole set to the
 * browser, which then filtered it with Array.filter. That worked at a few
 * hundred rows and was never going to work at several thousand — and it made
 * ordering by relevance impossible, because the score wasn't known until after
 * every row had already crossed the wire.
 */
export async function getJobs(db: Database, userId: string, input: GetJobsInput): Promise<JobsPage> {
  const conditions = buildJobFilters(userId, input);

  const keyset = input.cursor ? cursorCondition(input.cursor, input.sort) : null;
  if (keyset) conditions.push(keyset);

  const expression = sortExpression(input.sort);
  const direction = isAscending(input.sort) ? asc : desc;

  // One more than asked for: if it comes back, there is another page, and the
  // extra row is what the next cursor is built from. Cheaper than a count.
  const rows = await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(direction(expression), direction(jobs.id))
    .limit(input.limit + 1);

  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  const lastRow = page.at(-1);

  return {
    jobs: page,
    nextCursor: hasMore && lastRow ? encodeJobCursor(lastRow, input.sort) : null,
  };
}

/**
 * How many jobs sit in each status, for the filter chips above the list.
 *
 * Counted in SQL and in one round trip. The alternative — a query per status —
 * is ten queries to render one row of numbers.
 */
export async function getJobStatusCounts(
  db: Database,
  userId: string,
  bucketId?: string,
): Promise<Record<JobStatus, number>> {
  const conditions = [eq(jobs.userId, userId)];
  if (bucketId) conditions.push(eq(jobs.bucketId, bucketId));

  const rows = await db
    .select({ status: jobs.status, total: count() })
    .from(jobs)
    .where(and(...conditions))
    .groupBy(jobs.status);

  // Every status present, including the empty ones — a chip that vanishes when
  // its count hits zero moves every other chip, which is how a click lands on
  // the wrong filter.
  const counts = Object.fromEntries(
    [...OPEN_JOB_STATUSES, ...TERMINAL_JOB_STATUSES].map((status) => [status, 0]),
  ) as Record<JobStatus, number>;

  for (const row of rows) counts[row.status] = row.total;
  return counts;
}

export async function getJobById(db: Database, userId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1);
  return job ?? null;
}

// Loaded once per run so sources can skip the expensive detail fetch for jobs we
// already hold. Only the id column crosses the wire.
//
// Scoped to one source on purpose: ids are only unique within a source, and
// Greenhouse and LinkedIn both use bare numeric ids. Matching across sources
// would make a LinkedIn job vanish because some unrelated Greenhouse posting
// happened to share its number.
export async function getExistingSourceJobIds(
  db: Database,
  userId: string,
  source: ScrapedJob["source"],
): Promise<Set<string>> {
  const rows = await db
    .select({ sourceJobId: jobs.sourceJobId })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.source, source)));
  return new Set(rows.map((row) => row.sourceJobId));
}

// ─── Writing scrape results ───────────────────────────────────────────────────

export interface InsertJobsOptions {
  bucketId?: string | null;
  /** What the user was searching for, so each row can be scored as it lands. */
  query: JobSearchQuery;
}

/**
 * Stores what a scrape found.
 *
 * Three things happen here that didn't before, and all three exist so the list
 * can be ranked and trusted rather than merely long:
 *
 * 1. Every row is scored on the way in, because sorting by relevance has to
 *    happen in the database.
 * 2. A posting already held under a *different* source is folded into the row
 *    that's already there rather than inserted again.
 * 3. Anything re-encountered has its lastSeenAt refreshed, which is the only
 *    signal available for whether a posting is still up.
 *
 * The return value is still only the genuinely new rows — every caller reads its
 * length as "new jobs found" and reports that number to the user.
 */
export async function insertJobs(
  db: Database,
  userId: string,
  scrapedJobs: ScrapedJob[],
  options: InsertJobsOptions,
) {
  // Belt and braces: sources dedupe their own output, but a duplicate reaching
  // the insert would make the returned count — and so the run's stats — wrong.
  const uniqueJobs = dedupeBySourceJobId(scrapedJobs);
  if (uniqueJobs.length === 0) return [];

  const scored = uniqueJobs.map((job) => ({
    job,
    dedupeKey: buildDedupeKey({
      company: job.company,
      title: job.title,
      location: job.location,
    }),
    ...scoreJob(
      {
        title: job.title,
        tags: job.tags,
        salary: job.salary,
        description: job.description,
        isRemote: job.isRemote,
        postedAt: job.postedAt,
      },
      options.query,
    ),
  }));

  const existingByKey = await getJobsByDedupeKeys(
    db,
    userId,
    scored.map((entry) => entry.dedupeKey),
  );

  const toInsert: typeof scored = [];
  const toFold: { existing: ExistingJobIdentity; source: ScrapedJob["source"] }[] = [];
  // A single call always carries one source, but a source can list the same role
  // twice under two ids. The first wins; the rest would otherwise each insert a
  // row carrying an identical dedupe key.
  const claimedKeys = new Set<string>();

  for (const entry of scored) {
    const existing = existingByKey.get(entry.dedupeKey);

    if (!existing) {
      if (claimedKeys.has(entry.dedupeKey)) continue;
      claimedKeys.add(entry.dedupeKey);
      toInsert.push(entry);
      continue;
    }

    // The row we already hold *is* this listing — same source, same id. Nothing
    // to fold; the refresh below is all it needs.
    if (existing.source === entry.job.source && existing.sourceJobId === entry.job.sourceJobId) {
      continue;
    }

    toFold.push({ existing, source: entry.job.source });
  }

  const now = new Date();

  const inserted = toInsert.length === 0 ? [] : await db
    .insert(jobs)
    .values(
      toInsert.map(({ job, dedupeKey, score, reasons }) => ({
        userId,
        bucketId: options.bucketId ?? null,
        source: job.source,
        sourceJobId: job.sourceJobId,
        title: job.title,
        company: job.company,
        companyUrl: job.companyUrl,
        location: job.location,
        salary: job.salary,
        description: job.description,
        jobUrl: job.jobUrl,
        postedAt: job.postedAt,
        workType: job.workType,
        isRemote: job.isRemote,
        tags: job.tags,
        attributionText: job.attributionText,
        attributionUrl: job.attributionUrl,
        score,
        scoreReasons: reasons,
        dedupeKey,
        lastSeenAt: now,
      })),
    )
    // Backed by the (userId, source, sourceJobId) unique index. sourceJobId is
    // NOT NULL, so this actually fires — a nullable column would make every row
    // distinct and silently duplicate the whole scrape.
    .onConflictDoNothing({
      target: [jobs.userId, jobs.source, jobs.sourceJobId],
    })
    .returning();

  // Deliberately separate statements. The insert has to keep returning only
  // genuinely new rows, so everything that updates an existing row happens after
  // it rather than as an ON CONFLICT clause.
  await refreshLastSeen(db, userId, uniqueJobs, now);
  await foldDuplicateSources(db, userId, toFold, now);

  if (options.bucketId && inserted.length < uniqueJobs.length) {
    await adoptUnfiledJobs(db, userId, uniqueJobs, options.bucketId);
  }

  return inserted;
}

/**
 * Every row this user already holds under one of these fingerprints.
 *
 * Keyed by dedupeKey. Where the same key somehow appears on two rows — possible
 * for anything inserted before the column existed and backfilled to the same
 * value — the first wins, which keeps the fold deterministic.
 */
interface ExistingJobIdentity {
  id: string;
  source: string;
  sourceJobId: string;
  alsoOnSources: string[];
}

async function getJobsByDedupeKeys(db: Database, userId: string, dedupeKeys: string[]) {
  const uniqueKeys = [...new Set(dedupeKeys)];
  if (uniqueKeys.length === 0) return new Map<string, ExistingJobIdentity>();

  const rows = await db
    .select({
      id: jobs.id,
      source: jobs.source,
      sourceJobId: jobs.sourceJobId,
      dedupeKey: jobs.dedupeKey,
      alsoOnSources: jobs.alsoOnSources,
    })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), inArray(jobs.dedupeKey, uniqueKeys)));

  const byKey = new Map<string, ExistingJobIdentity>();
  for (const row of rows) {
    if (!row.dedupeKey || byKey.has(row.dedupeKey)) continue;
    byKey.set(row.dedupeKey, {
      id: row.id,
      source: row.source,
      sourceJobId: row.sourceJobId,
      alsoOnSources: row.alsoOnSources ?? [],
    });
  }

  return byKey;
}

/**
 * Marks everything this run re-encountered as still up.
 *
 * This is the whole freshness mechanism: no board tells us a listing has closed,
 * so "the sources stopped returning it" is the only available signal.
 */
async function refreshLastSeen(
  db: Database,
  userId: string,
  scrapedJobs: ScrapedJob[],
  seenAt: Date,
) {
  // sourceJobId is only unique within a source, so the ids have to be matched
  // per source — the same number can mean a Greenhouse job and a LinkedIn one.
  const idsBySource = groupSourceJobIds(scrapedJobs);

  for (const [source, sourceJobIds] of idsBySource) {
    await db
      .update(jobs)
      .set({ lastSeenAt: seenAt })
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.source, source),
          inArray(jobs.sourceJobId, sourceJobIds),
        ),
      );
  }
}

/**
 * Records that a posting we already hold also appeared on another board.
 *
 * The duplicate is not inserted — that's the point — but the fact that a second
 * source is carrying the same role is worth keeping: it's a mild signal the
 * listing is live, and it explains to the user why their RemoteOK search found
 * nothing new.
 */
async function foldDuplicateSources(
  db: Database,
  userId: string,
  duplicates: { existing: ExistingJobIdentity; source: ScrapedJob["source"] }[],
  seenAt: Date,
) {
  if (duplicates.length === 0) return;

  // One statement per job, not per duplicate — a batch commonly folds several
  // listings onto the same row, and each would otherwise be its own update.
  const merged = new Map<string, { alsoOnSources: Set<string> }>();

  for (const duplicate of duplicates) {
    const entry = merged.get(duplicate.existing.id) ?? {
      // Seeded from what the row already holds. Read-modify-write is safe here
      // because a user can only have one scrape running at a time — the partial
      // unique index on scrape_runs enforces it — so nothing else is writing
      // this column concurrently.
      alsoOnSources: new Set(duplicate.existing.alsoOnSources),
    };
    entry.alsoOnSources.add(duplicate.source);
    merged.set(duplicate.existing.id, entry);
  }

  for (const [jobId, entry] of merged) {
    await db
      .update(jobs)
      .set({
        lastSeenAt: seenAt,
        // Sorted so the value is stable across runs and doesn't churn the row
        // every time the sources come back in a different order.
        alsoOnSources: [...entry.alsoOnSources].sort(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));
  }
}

function groupSourceJobIds(scrapedJobs: ScrapedJob[]) {
  const idsBySource = new Map<ScrapedJob["source"], string[]>();
  for (const job of scrapedJobs) {
    const ids = idsBySource.get(job.source) ?? [];
    ids.push(job.sourceJobId);
    idsBySource.set(job.source, ids);
  }
  return idsBySource;
}

/**
 * Files jobs that already exist but belong to no bucket.
 *
 * The insert above never rewrites an existing row, which is right for the job
 * data itself and was wrong for bucket_id: it got decided at first insert and
 * never again. Everything scraped before buckets existed, and everything from
 * the dashboard's unfiltered button, sat at NULL and could never reach a bucket
 * no matter how often the right search re-found it.
 *
 * `isNull(bucketId)` is what keeps filing a one-way door — a job already filed
 * under one hunt does not move because a second search turned it up too.
 */
async function adoptUnfiledJobs(
  db: Database,
  userId: string,
  scrapedJobs: ScrapedJob[],
  bucketId: string,
) {
  const idsBySource = groupSourceJobIds(scrapedJobs);

  for (const [source, sourceJobIds] of idsBySource) {
    await db
      .update(jobs)
      .set({ bucketId })
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.source, source),
          inArray(jobs.sourceJobId, sourceJobIds),
          isNull(jobs.bucketId),
        ),
      );
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

/**
 * Moves jobs to a status, and returns what actually changed.
 *
 * Rows already in the target status are excluded from the update, so a bulk
 * action over a mixed selection doesn't write a "moved to applied" event for the
 * eight that were already applied. The userId in the WHERE clause is the
 * authorisation check, not a filter — the ids come from the client.
 */
export async function setJobsStatus(
  db: Database,
  userId: string,
  jobIds: string[],
  status: JobStatus,
  dismissReason?: JobDismissReason,
) {
  if (jobIds.length === 0) return [];

  const changedAt = new Date();

  return db
    .update(jobs)
    .set({
      status,
      statusChangedAt: changedAt,
      // Written once, the first time it's reached. Re-applying wouldn't be true,
      // and this is the field you read months later to answer "when did I apply".
      ...(status === "applied" ? { appliedAt: sql`coalesce(${jobs.appliedAt}, ${changedAt})` } : {}),
      // Always written on a move, in both directions: a job you reopen must not
      // keep reading as "dismissed — wrong stack" while sitting in your shortlist.
      dismissReason: status === "dismissed" ? (dismissReason ?? null) : null,
    })
    .where(
      and(
        eq(jobs.userId, userId),
        inArray(jobs.id, jobIds),
        sql`${jobs.status} <> ${status}`,
      ),
    )
    .returning({ id: jobs.id, status: jobs.status, title: jobs.title });
}

/**
 * Refiles jobs into another bucket, or out of every bucket.
 *
 * Unlike adoptUnfiledJobs during a scrape, this moves a job that is already
 * filed — it is an explicit instruction rather than an inference, and the whole
 * point is to correct a hunt the automation guessed wrong.
 */
export async function moveJobsToBucket(
  db: Database,
  userId: string,
  jobIds: string[],
  bucketId: string | null,
) {
  if (jobIds.length === 0) return [];

  return db
    .update(jobs)
    .set({ bucketId })
    .where(and(eq(jobs.userId, userId), inArray(jobs.id, jobIds)))
    .returning({ id: jobs.id });
}

/**
 * Just enough of every live job to test it against a mute rule.
 *
 * Three short columns rather than `select()`: matching happens in TypeScript,
 * because a rule normalises Arabic and folds case in ways SQL's ILIKE does not,
 * and shipping full descriptions across for a text comparison would be absurd.
 * Terminal rows are excluded — a rule sweeping up jobs you already rejected
 * would rewrite history for no benefit.
 */
export async function getJobIdentitiesForMuting(db: Database, userId: string) {
  return db
    .select({ id: jobs.id, title: jobs.title, company: jobs.company })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), inArray(jobs.status, OPEN_JOB_STATUSES)));
}

/**
 * Other live roles at the same company, for the detail panel.
 *
 * "They're hiring four more people on this team" changes whether a posting is
 * worth an application, and it is one query the user cannot run for themselves
 * without searching the company by hand.
 */
export async function getOtherJobsAtCompany(
  db: Database,
  userId: string,
  company: string,
  excludeJobId: string,
  limit: number,
) {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      location: jobs.location,
      score: jobs.score,
      status: jobs.status,
      jobUrl: jobs.jobUrl,
      postedAt: jobs.postedAt,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.userId, userId),
        // Case-insensitive: the same employer arrives as "Acme" from one board
        // and "ACME" from another, and an exact match would find neither.
        sql`lower(${jobs.company}) = lower(${company})`,
        sql`${jobs.id} <> ${excludeJobId}`,
        inArray(jobs.status, OPEN_JOB_STATUSES),
      ),
    )
    .orderBy(desc(sql`coalesce(${jobs.score}, ${UNSCORED_SORTS_LAST})`))
    .limit(limit);
}

/** The statuses these jobs are in right now, so the event log can record the transition. */
export async function getJobStatuses(db: Database, userId: string, jobIds: string[]) {
  if (jobIds.length === 0) return new Map<string, JobStatus>();

  const rows = await db
    .select({ id: jobs.id, status: jobs.status })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), inArray(jobs.id, jobIds)));

  return new Map(rows.map((row) => [row.id, row.status]));
}

export async function updateJobNotes(db: Database, userId: string, jobId: string, notes: string) {
  const [updated] = await db
    .update(jobs)
    // Empty means cleared, not an empty string sitting in the column and
    // rendering as a blank note.
    .set({ notes: notes.length > 0 ? notes : null })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .returning({ id: jobs.id, notes: jobs.notes });

  return updated ?? null;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type NewJobEvent = typeof jobEvents.$inferInsert;

export async function insertJobEvents(db: Database, events: NewJobEvent[]) {
  if (events.length === 0) return [];
  return db.insert(jobEvents).values(events).returning();
}

export async function getJobEvents(db: Database, userId: string, jobId: string) {
  return db
    .select()
    .from(jobEvents)
    .where(and(eq(jobEvents.userId, userId), eq(jobEvents.jobId, jobId)))
    .orderBy(desc(jobEvents.createdAt));
}

// ─── Deleting ─────────────────────────────────────────────────────────────────

// Clears a user's jobs from one source — used when they turn a source off, and to
// force a re-pull after a parser fix (dedupe means existing rows are never
// rewritten, so stale data has to be removed rather than updated).
export async function deleteJobsBySource(
  db: Database,
  userId: string,
  source: ScrapedJob["source"],
) {
  return db
    .delete(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.source, source)))
    .returning({ id: jobs.id });
}

/**
 * Deletes specific jobs.
 *
 * The userId in the WHERE clause is the authorisation check, not a filter — the
 * ids come from the client, so without it any id in the table would be fair game.
 * Returns the rows actually removed so the caller can report a real count rather
 * than echoing back what was asked for.
 */
export async function deleteJobsByIds(db: Database, userId: string, jobIds: string[]) {
  if (jobIds.length === 0) return [];

  return db
    .delete(jobs)
    .where(and(eq(jobs.userId, userId), inArray(jobs.id, jobIds)))
    .returning({ id: jobs.id });
}

export async function deleteAllJobs(
  db: Database,
  userId: string,
  filters: { bucketId?: string; onlyClosed?: boolean } = {},
) {
  const conditions = [eq(jobs.userId, userId)];
  if (filters.bucketId) conditions.push(eq(jobs.bucketId, filters.bucketId));
  if (filters.onlyClosed) conditions.push(inArray(jobs.status, TERMINAL_JOB_STATUSES));

  return db
    .delete(jobs)
    .where(and(...conditions))
    .returning({ id: jobs.id });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getJobsStats(db: Database, userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Counted in SQL rather than by pulling every row — job descriptions are large
  // and there's no reason to ship them across the wire to compute four numbers.
  const [stats] = await db
    .select({
      total: count(),
      scrapedToday: count(sql`CASE WHEN ${jobs.createdAt} >= ${startOfToday} THEN 1 END`),
      // What's still live and worth looking at, which is the number the Jobs page
      // shows. Replaces the old "processed" count, which meant "we ran a
      // hiring-manager lookup on it" and could never move once that broke.
      open: count(sql`CASE WHEN ${jobs.status} IN ('new', 'shortlisted', 'applying') THEN 1 END`),
      applied: count(
        sql`CASE WHEN ${jobs.status} IN ('applied', 'screening', 'interviewing', 'offer') THEN 1 END`,
      ),
    })
    .from(jobs)
    .where(eq(jobs.userId, userId));

  return {
    total: stats?.total ?? 0,
    scrapedToday: stats?.scrapedToday ?? 0,
    open: stats?.open ?? 0,
    applied: stats?.applied ?? 0,
  };
}
