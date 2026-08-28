import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Fills in score and dedupe_key on jobs scraped before those columns existed.
 *
 *   npm run backfill:jobs -- <userId>
 *   npm run backfill:jobs -- <userId> --dry-run
 *
 * Migration 0014 deliberately leaves both null. They're computed by TypeScript —
 * `scoreJob` against the account's own criteria, and `buildDedupeKey` through the
 * same Arabic-aware normaliser the matcher uses — so neither can be derived in
 * SQL, and an approximation written in SQL would never agree with what the
 * scraper computes for new rows.
 *
 * Without this, existing jobs sort last under "Best match" and show "—" instead
 * of a number. Safe to re-run: it only writes rows where the column is still null.
 */

// Written in batches so a few thousand rows don't become one enormous statement,
// and so an interrupted run leaves everything before the break already done.
const BATCH_SIZE = 200;

async function main() {
  const [userId, ...flags] = process.argv.slice(2);
  const isDryRun = flags.includes("--dry-run");

  if (!userId) {
    console.error("Usage: npm run backfill:jobs -- <userId> [--dry-run]");
    process.exit(1);
  }

  const { db } = await import("../src/lib/db");
  const { jobs } = await import("../src/lib/db/schema");
  const { and, eq, isNull, or } = await import("drizzle-orm");
  const { getActiveCriteria } = await import("../src/criteria/criteria.db");
  const { scoreJob } = await import("../src/jobs/score-job");
  const { buildDedupeKey } = await import("../src/jobs/build-dedupe-key");

  const criteria = await getActiveCriteria(db, userId);

  if (!criteria) {
    // Scoring against an empty query gives every job full marks for title match,
    // which is a uniform ranking and therefore no ranking at all.
    console.warn(
      "No active criteria for this account — every job would score the same.\n" +
        "Set up your search at /criteria first, then run this again.",
    );
    process.exit(1);
  }

  const query = {
    titles: criteria.titles ?? [],
    locations: criteria.locations ?? [],
    salaryMin: criteria.salaryMin ?? undefined,
  };

  const pending = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.userId, userId), or(isNull(jobs.score), isNull(jobs.dedupeKey))));

  console.log(`${pending.length} job(s) to backfill for ${userId}`);
  if (pending.length === 0) return;

  if (isDryRun) {
    for (const job of pending.slice(0, 10)) {
      const { score, reasons } = scoreJob(job, query);
      console.log(`  ${String(score).padStart(3)}  ${job.title} — ${reasons.join(", ") || "no signals"}`);
    }
    console.log(`\nDry run — nothing written. ${pending.length} row(s) would change.`);
    return;
  }

  let written = 0;

  for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
    const batch = pending.slice(offset, offset + BATCH_SIZE);

    await Promise.all(
      batch.map(async (job) => {
        const { score, reasons } = scoreJob(job, query);

        await db
          .update(jobs)
          .set({
            score,
            scoreReasons: reasons,
            dedupeKey: buildDedupeKey({
              company: job.company,
              title: job.title,
              location: job.location,
            }),
          })
          .where(and(eq(jobs.id, job.id), eq(jobs.userId, job.userId)));
      }),
    );

    written += batch.length;
    console.log(`  ${written}/${pending.length}`);
  }

  console.log(`Done — ${written} job(s) scored and fingerprinted.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
