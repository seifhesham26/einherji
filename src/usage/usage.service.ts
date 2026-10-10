import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { admitUsage, getSharedAiUsage, getUsageInWindow, type UsageAdmissionOptions } from "./usage.db";
import { getDailyQuotaLimits } from "./quota-policy";
import {
  QUOTA_WINDOW_MS,
  USAGE_ACTION_LABELS,
  type UsageAction,
} from "./usage.validators";

const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;

/**
 * Checks the caller is under quota for a billable action, then records the use.
 *
 * Call this *before* the expensive work, not after. A call that fails partway
 * can still have been billed by the provider, and counting only successes would
 * leave a retry loop free to spend without limit.
 *
 * Admission resolves only after its database transaction commits. Database
 * failures, including an unknown commit outcome, never authorize provider work.
 */
export async function consumeQuota(db: Database, userId: string, action: UsageAction, options?: UsageAdmissionOptions) {
  const limit = getDailyQuotaLimits()[action];
  const { admitted, oldestAt, sharedExhausted } = options
    ? await admitUsage(db, userId, action, limit, options)
    : await admitUsage(db, userId, action, limit);

  if (!admitted) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: sharedExhausted
        ? "Shared AI capacity is exhausted or paused. Saved data remains available; try again later."
        : limit === 0 ? "This action is paused for the pilot."
        : `Daily limit reached — ${limit} ${USAGE_ACTION_LABELS[action]} per 24 hours. ${describeReset(oldestAt)}`,
    });
  }
}

/** Remaining allowance per action, for showing usage in the UI. */
export async function fetchQuotaStatus(db: Database, userId: string) {
  const windowStart = new Date(Date.now() - QUOTA_WINDOW_MS);

  const limits = getDailyQuotaLimits();
  const actions = Object.keys(limits) as UsageAction[];
  const windows = await Promise.all(
    actions.map((action) => getUsageInWindow(db, userId, action, windowStart)),
  );

  return actions.map((action, index) => ({
    action,
    label: USAGE_ACTION_LABELS[action],
    used: windows[index].used,
    limit: limits[action],
    remaining: Math.max(limits[action] - windows[index].used, 0),
  }));
}

export async function fetchSharedAiQuotaStatus(db: Database, limit: number) {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("Invalid shared AI limit");
  const used = await getSharedAiUsage(db, new Date(Date.now() - QUOTA_WINDOW_MS));
  return { used, limit, remaining: Math.max(limit - used, 0), paused: limit === 0 };
}

// "Try again in about 3 hours." — the oldest event leaving the window is exactly
// when the next unit frees up.
function describeReset(oldestAt: Date | null): string {
  if (!oldestAt) return "Try again later.";

  const msUntilReset = oldestAt.getTime() + QUOTA_WINDOW_MS - Date.now();
  if (msUntilReset <= 0) return "Try again now.";

  const minutes = Math.ceil(msUntilReset / MS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return `Try again in about ${minutes} minute(s).`;

  return `Try again in about ${Math.ceil(minutes / MINUTES_PER_HOUR)} hour(s).`;
}
