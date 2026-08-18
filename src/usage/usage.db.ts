import { and, count, eq, gte, min } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { usageEvents } from "@/lib/db/schema";
import type { UsageAction } from "./usage.validators";

export interface UsageWindow {
  used: number;
  // When the oldest event in the window ages out — i.e. when capacity returns.
  oldestAt: Date | null;
}

export async function getUsageInWindow(
  db: Database,
  userId: string,
  action: UsageAction,
  since: Date,
): Promise<UsageWindow> {
  // Count and oldest timestamp in one round trip; both come off the same index.
  const [row] = await db
    .select({ used: count(), oldestAt: min(usageEvents.createdAt) })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.action, action),
        gte(usageEvents.createdAt, since),
      ),
    );

  return {
    used: row?.used ?? 0,
    oldestAt: row?.oldestAt ? new Date(row.oldestAt) : null,
  };
}

export async function recordUsage(db: Database, userId: string, action: UsageAction) {
  await db.insert(usageEvents).values({ userId, action });
}
