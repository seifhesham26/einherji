import { afterAll, describe, expect, it, vi } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, inArray, sql } from "drizzle-orm";
import { config } from "dotenv";
import { createId } from "@paralleldrive/cuid2";
import { setTimeout as delay } from "node:timers/promises";
import * as schema from "@/lib/db/schema";
import { consumeQuota, fetchQuotaStatus } from "./usage.service";
import { AI_USAGE_ACTIONS, DAILY_QUOTAS, QUOTA_WINDOW_MS, type UsageAction } from "./usage.validators";
import { resolveUsageTestTarget } from "./__tests__/usage-test-target";

config({ path: [".env.test.local", ".env.local", ".env"], quiet: true });
const target = resolveUsageTestTarget(process.env);
const testDb = target ? drizzle(neon(target), { schema }) : null;
const describeQuota = target ? describe : describe.skip;
const fixtureIds = new Set<string>();

function database() {
  if (!testDb) throw new Error("Usage-test database not configured");
  return testDb;
}

async function newUser(id = `quota-test-${createId()}`) {
  fixtureIds.add(id);
  await database().insert(schema.users).values({
    id, name: "Quota Test", email: `${id}@invalid.test`, emailVerified: false,
    createdAt: new Date(), updatedAt: new Date(),
  });
  return id;
}

async function seed(id: string, action: UsageAction, amount: number, ageMs = 0) {
  await database().$client.query(`
    INSERT INTO usage_events (id, user_id, action, created_at)
    SELECT $1 || '-' || n, $2, $3::usage_action,
      clock_timestamp()::timestamp - ($5::double precision * interval '1 millisecond')
    FROM generate_series(1, $4::integer) AS n
  `, [createId(), id, action, amount, ageMs]);
}

async function persisted(id: string, action: UsageAction) {
  const [row] = await database().$client.query(
    "SELECT count(*) AS used FROM usage_events WHERE user_id = $1 AND action = $2::usage_action", [id, action],
  );
  return Number(row.used);
}

async function waitForLock(key: string, granted: boolean) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const [row] = await database().$client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_locks
        WHERE locktype = 'advisory' AND objsubid = 1 AND granted = $2
          AND classid = ((hashtextextended($1, 0) >> 32) & 4294967295)::oid
          AND objid = (hashtextextended($1, 0) & 4294967295)::oid
      ) AS present
    `, [key, granted]);
    if (row.present === true) return;
    await delay(50);
  }
  throw new Error("The required quota-lock state was not observed");
}

afterAll(async () => {
  if (testDb && fixtureIds.size) {
    // Even an ambiguous fixture insert cannot authorize deleting an existing account.
    await testDb.delete(schema.users).where(and(
      inArray(schema.users.id, [...fixtureIds]),
      eq(schema.users.name, "Quota Test"),
      sql`${schema.users.email} = ${schema.users.id} || '@invalid.test'`,
    ));
    const remaining = await testDb.select({ id: schema.users.id })
      .from(schema.users).where(inArray(schema.users.id, [...fixtureIds]));
    expect(remaining).toHaveLength(0);
  }
});

describeQuota("atomic usage quotas (writes only test-owned fixtures)", () => {
  it("admits one of twenty accounts/actions competing for shared final capacity", async () => {
    const ids: string[] = [];
    for (let index = 0; index < 4; index++) ids.push(await newUser());
    const [baseline] = await database().$client.query(`
      SELECT count(*) AS used FROM usage_events WHERE action = ANY($1::usage_action[])
        AND created_at >= clock_timestamp()::timestamp - interval '24 hours'
    `, [[...AI_USAGE_ACTIONS]]);
    const sharedAiLimit = Number(baseline.used) + 1;
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
      consumeQuota(database(), ids[index % ids.length], index % 2 ? "parse_cv" : "generate_document", { sharedAiLimit }),
    ));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of results) {
      if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "TOO_MANY_REQUESTS", message: expect.stringContaining("Shared AI capacity") });
    }
    const [saved] = await database().$client.query("SELECT count(*) AS used FROM usage_events WHERE user_id = ANY($1::text[])", [ids]);
    expect(Number(saved.used)).toBe(1);
  }, 120_000);

  it("counts another account's AI action toward shared capacity without inserting on denial", async () => {
    const first = await newUser();
    const second = await newUser();
    await seed(first, "generate_fit_report", 1);
    const [baseline] = await database().$client.query(`
      SELECT count(*) AS used FROM usage_events WHERE action = ANY($1::usage_action[])
        AND created_at >= clock_timestamp()::timestamp - interval '24 hours'
    `, [[...AI_USAGE_ACTIONS]]);
    await expect(consumeQuota(database(), second, "parse_cv", { sharedAiLimit: Number(baseline.used) }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS", message: expect.stringContaining("Shared AI capacity") });
    expect(await persisted(second, "parse_cv")).toBe(0);
    expect(await persisted(first, "generate_fit_report")).toBe(1);
  });

  it("admits exactly one of twenty contenders for the last unit", async () => {
    const id = await newUser();
    await seed(id, "parse_cv", DAILY_QUOTAS.parse_cv - 1);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => consumeQuota(database(), id, "parse_cv")));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of results) {
      if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "TOO_MANY_REQUESTS" });
    }
    expect(await persisted(id, "parse_cv")).toBe(DAILY_QUOTAS.parse_cv);
  }, 120_000);

  it("does not insert for concurrent exhausted requests", async () => {
    const id = await newUser();
    await seed(id, "parse_cv", DAILY_QUOTAS.parse_cv);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => consumeQuota(database(), id, "parse_cv")));
    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason).toMatchObject({ code: "TOO_MANY_REQUESTS" });
    }
    expect(await persisted(id, "parse_cv")).toBe(DAILY_QUOTAS.parse_cv);
  }, 120_000);

  it("keeps accounts and actions separate", async () => {
    const first = await newUser();
    const second = await newUser();
    await seed(first, "parse_cv", DAILY_QUOTAS.parse_cv);
    await expect(consumeQuota(database(), first, "parse_cv")).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(consumeQuota(database(), first, "generate_document")).resolves.toBeUndefined();
    await expect(consumeQuota(database(), second, "parse_cv")).resolves.toBeUndefined();
  }, 120_000);

  it("expires old capacity without deleting history and retains status fields", async () => {
    const id = await newUser();
    await seed(id, "parse_cv", DAILY_QUOTAS.parse_cv, QUOTA_WINDOW_MS + 3_600_000);
    await consumeQuota(database(), id, "parse_cv");
    expect(await persisted(id, "parse_cv")).toBe(DAILY_QUOTAS.parse_cv + 1);
    const status = await fetchQuotaStatus(database(), id);
    expect(status.find((entry) => entry.action === "parse_cv")).toEqual({
      action: "parse_cv", label: "CV parses", used: 1, limit: 20, remaining: 19,
    });
  }, 120_000);

  it("counts provider failure and prevents work after exhausted admission", async () => {
    const id = await newUser();
    const provider = vi.fn().mockRejectedValue(new Error("Provider failed"));
    const request = async () => { await consumeQuota(database(), id, "parse_cv"); return provider(); };
    await expect(request()).rejects.toThrow("Provider failed");
    expect(await persisted(id, "parse_cv")).toBe(1);
    await seed(id, "parse_cv", DAILY_QUOTAS.parse_cv - 1);
    provider.mockClear();
    await expect(request()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(provider).not.toHaveBeenCalled();
  }, 120_000);

  it("fails closed on SQL error and releases the quota lock", async () => {
    const id = `quota-test-${createId()}`;
    const provider = vi.fn();
    const request = async () => { await consumeQuota(database(), id, "parse_cv"); return provider(); };
    await expect(request()).rejects.toThrow();
    expect(provider).not.toHaveBeenCalled();
    expect(await persisted(id, "parse_cv")).toBe(0);
    await newUser(id);
    await expect(consumeQuota(database(), id, "parse_cv")).resolves.toBeUndefined();
    expect(await persisted(id, "parse_cv")).toBe(1);
  }, 120_000);

  it("observes the previous holder's commit after waiting for the lock", async () => {
    const id = await newUser();
    await seed(id, "parse_cv", DAILY_QUOTAS.parse_cv - 1);
    const client = database().$client;
    const key = JSON.stringify(["einherji:usage-quota:v1", id, "parse_cv"]);
    const holder = client.transaction([
      client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]),
      client.query("INSERT INTO usage_events (id, user_id, action, created_at) VALUES ($1, $2, 'parse_cv', clock_timestamp()::timestamp)", [createId(), id]),
      client.query("SELECT pg_sleep(3)"),
    ], { isolationLevel: "ReadCommitted" }).then(() => ({ ok: true }), (error: unknown) => ({ ok: false, error }));
    let contender: Promise<unknown> | undefined;
    try {
      await waitForLock(key, true);
      contender = consumeQuota(database(), id, "parse_cv").then(() => ({ ok: true }), (error: unknown) => ({ ok: false, error }));
      await waitForLock(key, false);
      expect(await holder).toEqual({ ok: true });
      expect(await contender).toMatchObject({ ok: false, error: { code: "TOO_MANY_REQUESTS" } });
      expect(await persisted(id, "parse_cv")).toBe(DAILY_QUOTAS.parse_cv);
    } finally {
      await holder;
      if (contender) await contender;
    }
  }, 120_000);
});
