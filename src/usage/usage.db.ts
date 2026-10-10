import { and, count, eq, gte, min } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@/lib/db";
import { usageEvents } from "@/lib/db/schema";
import { QUOTA_WINDOW_MS, type UsageAction } from "./usage.validators";

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

export async function admitUsage(
  db: Pick<Database, "$client">,
  userId: string,
  action: UsageAction,
  limit: number,
): Promise<{ admitted: boolean; oldestAt: Date | null }> {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("Invalid quota limit");
  if (limit === 0) return { admitted: false, oldestAt: null };
  const client = db.$client;
  // A separate post-lock command gets a fresh snapshot of the previous holder's commit.
  const results = await client.transaction([
    client.query("SELECT set_config('lock_timeout', '5s', true), set_config('statement_timeout', '10s', true)"),
    client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      JSON.stringify(["einherji:usage-quota:v1", userId, action]),
    ]),
    client.query(`
      WITH instant AS MATERIALIZED (
        SELECT clock_timestamp()::timestamp AS at
      ), window_usage AS MATERIALIZED (
        SELECT count(*) AS used, min(e.created_at) AS "oldestAt"
        FROM usage_events e CROSS JOIN instant
        WHERE e.user_id = $2 AND e.action = $3::usage_action
          AND e.created_at >= instant.at - ($5::double precision * interval '1 millisecond')
      ), inserted AS (
        INSERT INTO usage_events (id, user_id, action, created_at)
        SELECT $1, $2, $3::usage_action, instant.at
        FROM instant CROSS JOIN window_usage
        WHERE window_usage.used < $4
        RETURNING id
      )
      SELECT EXISTS (SELECT 1 FROM inserted) AS admitted, window_usage."oldestAt"
      FROM window_usage
    `, [createId(), userId, action, limit, QUOTA_WINDOW_MS]),
  ], {
    isolationLevel: "ReadCommitted", arrayMode: false, fullResults: false,
    fetchOptions: { signal: AbortSignal.timeout(20_000) },
  });
  const rows = results[2];
  const row = rows?.[0];
  if (!Array.isArray(rows) || rows.length !== 1 || typeof row?.admitted !== "boolean") {
    throw new Error("Invalid quota admission result");
  }
  const raw = row.oldestAt;
  if (raw !== null && !(raw instanceof Date) && typeof raw !== "string") {
    throw new Error("Invalid quota admission timestamp");
  }
  const oldestAt = raw === null ? null : raw instanceof Date ? raw : new Date(raw);
  if (oldestAt && Number.isNaN(oldestAt.getTime())) throw new Error("Invalid quota admission timestamp");
  return { admitted: row.admitted, oldestAt };
}
