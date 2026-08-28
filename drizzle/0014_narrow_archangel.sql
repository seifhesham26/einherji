-- Retires is_processed in favour of the job_status pipeline added in 0013.
--
-- is_processed meant "we ran a hiring-manager lookup on this job" — a fact about
-- an internal step rather than about the hunt, and unreachable since that lookup
-- started requiring a logged-in LinkedIn session. Everything it was ever true
-- for is a job the user had picked out and started working, which is exactly
-- what "shortlisted" means. Nothing is lost by the drop below because this runs
-- first.
UPDATE "jobs" SET
  "status" = 'shortlisted',
  "status_changed_at" = COALESCE("created_at", now())
WHERE "is_processed" = true;
--> statement-breakpoint

-- last_seen_at was added with DEFAULT now(), which would claim every existing
-- row was confirmed live at migration time. The honest answer is when we
-- actually last saw it, which for a row nothing has refreshed is when it was
-- scraped. Rows older than the staleness window will therefore show as "may be
-- closed" until the next scrape re-finds them — which is correct, and is the
-- whole point of the column.
UPDATE "jobs" SET "last_seen_at" = COALESCE("created_at", now());
--> statement-breakpoint

-- Note on the two columns this does NOT backfill:
--
-- score and dedupe_key are both computed by TypeScript (scoreJob and
-- buildDedupeKey), against the user's own criteria, so neither can be derived in
-- SQL. Approximating them here would be worse than leaving them null: a
-- dedupe_key built by a different algorithm never matches the one the scraper
-- computes, so it would fold nothing while looking like it should.
--
-- Existing rows therefore sort last under "Best match" and show "—" instead of a
-- score. Run `npm run backfill:jobs` to fill both in properly.
ALTER TABLE "jobs" DROP COLUMN "is_processed";
