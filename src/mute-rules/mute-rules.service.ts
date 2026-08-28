import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { changeJobStatus } from "@/jobs/jobs.service";
import { getJobIdentitiesForMuting } from "@/jobs/jobs.db";
import {
  deleteMuteRule,
  getMuteRuleByPattern,
  getMuteRules,
  insertMuteRule,
} from "./mute-rules.db";
import { findMatchingMuteRule } from "./matches-mute-rule";
import type { CreateMuteRuleInput, DeleteMuteRuleInput } from "./mute-rules.validators";

// The sweep sends every matching id in one mutation, and the ids travel in the
// request body. Past this the sweep is chunked rather than refused — a rule on a
// prolific staffing agency legitimately matches hundreds of rows.
const MAX_SWEEP_BATCH = 400;

export async function fetchMuteRules(db: Database, userId: string) {
  return getMuteRules(db, userId);
}

/**
 * Saves a rule and, unless told otherwise, clears out what it already matches.
 *
 * A rule that only affects future scrapes appears to do nothing: the forty rows
 * that prompted the user to write it are still sitting there. Sweeping is what
 * makes the action feel like it worked.
 *
 * The sweep dismisses rather than deletes. A deleted job comes straight back on
 * the next scrape — the rule would stop it, but only until the rule is removed,
 * at which point the whole history of what was muted is gone.
 */
export async function createMuteRule(db: Database, userId: string, input: CreateMuteRuleInput) {
  const pattern = input.pattern.trim();

  const rule =
    (await insertMuteRule(db, userId, { kind: input.kind, pattern })) ??
    // onConflictDoNothing returned nothing, so the rule already exists. Reading
    // it back means "mute this company" is idempotent from the card, which is
    // where it will be clicked twice.
    (await getMuteRuleByPattern(db, userId, input.kind, pattern));

  if (!rule) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save the rule" });
  }

  if (!input.dismissExisting) return { rule, dismissedCount: 0 };

  const candidates = await getJobIdentitiesForMuting(db, userId);
  const matchedIds = candidates
    .filter((job) => findMatchingMuteRule(job, [rule]))
    .map((job) => job.id);

  let dismissedCount = 0;
  for (let start = 0; start < matchedIds.length; start += MAX_SWEEP_BATCH) {
    const batch = matchedIds.slice(start, start + MAX_SWEEP_BATCH);
    const { updatedCount } = await changeJobStatus(db, userId, {
      jobIds: batch,
      status: "dismissed",
      dismissReason: "muted",
      note: `Muted: ${pattern}`,
    });
    dismissedCount += updatedCount;
  }

  return { rule, dismissedCount };
}

/**
 * Removes a rule.
 *
 * Jobs it already dismissed stay dismissed. Un-muting is "stop hiding these from
 * now on", not "undo a decision I made a month ago" — and the next scrape brings
 * back anything still live.
 */
export async function removeMuteRule(db: Database, userId: string, input: DeleteMuteRuleInput) {
  const deleted = await deleteMuteRule(db, userId, input.id);
  if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Rule not found" });
  return deleted;
}
