# Atomic Usage Quotas Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax. Execution is native/inline, consistent with the project's one-implementer approach.

**Goal:** Make rolling per-user/action quota admission atomic without changing limits, schema, or caller interfaces.

**Architecture:** Use the existing Neon HTTP client's non-interactive `ReadCommitted` transaction. Acquire a transaction-scoped advisory lock before a separate conditional-insert command; return admission only after confirmed commit. Keep integration writes confined to an explicitly acknowledged disposable database.

**Tech Stack:** TypeScript, Vitest 4.1.10, Drizzle 0.45.2, Neon serverless 1.1.0, PostgreSQL, installed CUID and dotenv libraries.

**Spec:** [Approved atomic-quota design](../specs/2026-10-09-atomic-usage-quotas-design.md).

**Status:** Implementation plan for review. No product changes or database tests have been executed from this plan.

## Global Constraints

- Preserve the existing rolling 24-hour policy, quota values, account ownership, and usage history.
- Registration stays closed and model funding allowlists remain unchanged.
- Do not change schema, migrations, provider keys, personal seeds, or callers' interfaces.
- Use explicit `ReadCommitted` isolation; lock and conditional admission are separate commands.
- Set transaction-local lock/statement timeouts to five/ten seconds and the HTTP abort signal to twenty seconds.
- Expensive work must only start after a confirmed admission commit; unknown commits fail closed without automatic retries.
- No disposable connection has been supplied or verified. Never use the personal database for integration writes.
- Keep questionnaire edits untouched and unstaged.
- Commit and push coherent verified changes as requested. Product changes go to a feature branch, not deployment-tracking `main`, until the real-database gate passes.
- Shared budgets, smaller pilot allowances, funding-validation ordering, verified accounts, and provider retry policy are outside this slice.

## Workspace And File Map

At execution time, use `superpowers:using-git-worktrees`: inspect attached worktrees, reuse a suitable isolated checkout, or create a managed worktree from the pushed `origin/main`. Use its returned path for implementation; do not copy or reset the primary checkout's questionnaire edits. Create `feat/atomic-usage-quotas` in that checkout after checking that the name is unused; if it exists, inspect it rather than resetting it.

Follow the repository's setup in that checkout. If dependencies are absent, use `rtk npm ci`; do not add packages or change the lockfile for this work. The build also needs the existing private application environment; keep that configuration local and ignored, and report missing configuration rather than weakening validation. A disposable integration URL is a separate prerequisite, never a substitute for or automatic copy of the personal database URL.

- Modify `src/usage/usage.db.ts`: atomic SQL admission; retain the existing read helper.
- Modify `src/usage/usage.service.ts`: consume the atomic result; retain status and reset behavior.
- Create `src/usage/usage.db.test.ts`: bound transaction contract, decoding, and failures without a network call.
- Create `src/usage/usage.service.test.ts`: service errors, provider-call prevention, and status compatibility.
- Create `src/usage/__tests__/usage-test-target.ts` and `src/usage/usage-test-target.test.ts`: disposable-target safety, used only by tests.
- Replace the setup/scenarios in `src/usage/usage.integration.test.ts`: dedicated test client and independent fixtures.
- Create `docs/ATOMIC-USAGE-QUOTAS.md` and update `docs/SAAS-PHASED-PLAN.md`: actual verification evidence, operating instructions, and remaining gates.

## Review Focus

- Simultaneous contenders must observe the previous holder's commit, not a stale pre-lock snapshot: Task 2's lock-wait test.
- Delimiter-like user IDs must remain bound data and cannot change the lock's scope: Task 1's query-parameter test.
- Empty, malformed, or lost admission responses must never start provider work: Task 1's decoding and service failure tests.
- A direct/pooled URL or different credentials for the personal database must not bypass the test guard: Task 2's URL-identity tests.
- Old records must still count and rejected/expired work must not delete history: Task 2's persisted-count and expiry tests.

## Task 1 - Atomic Admission And Service Contract

**Files:** Modify the two usage modules; create their two unit-test files. Read `src/lib/db/schema.ts`, the installed Neon `CONFIG.md` transaction section, and `node_modules/drizzle-orm/neon-http/driver.d.ts` before editing. Search every `consumeQuota` and `recordUsage` caller.

**Interfaces:** Add `admitUsage(db: Pick<Database, "$client">, userId: string, action: UsageAction, limit: number): Promise<{ admitted: boolean; oldestAt: Date | null }>`. Preserve `consumeQuota(db, userId, action): Promise<void>`, `getUsageInWindow`, and the quota-status response shape. Remove the unrestricted `recordUsage` export once the service is updated.

- [ ] **Step 1: Write database-boundary regression tests.**

Use the real installed Neon query builder; mock only its transaction transport. Queries are lazy, so constructing them must not issue a request. Block global fetch as a safety net and restore mocks/globals after each test.

```typescript
import { neon } from "@neondatabase/serverless";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admitUsage } from "./usage.db";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function boundary() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected unit-test network")));
  const client = neon("postgresql://unit:unit@unit.example.invalid/test");
  const transaction = vi.spyOn(client, "transaction").mockResolvedValue([
    [], [], [{ admitted: true, oldestAt: null }],
  ]);
  return { db: { $client: client }, transaction };
}

describe("atomic quota admission", () => {
  it("admits only after the transaction resolves", async () => {
    const { db, transaction } = boundary();
    let release!: (rows: Record<string, unknown>[][]) => void;
    const gate = new Promise<Record<string, unknown>[][]>((resolve) => { release = resolve; });
    transaction.mockReturnValueOnce(gate);
    let completed = false;
    const pending = admitUsage(db, "account-a", "parse_cv", 20)
      .then((result) => { completed = true; return result; });
    await Promise.resolve();
    expect(completed).toBe(false);
    release([[], [], [{ admitted: true, oldestAt: null }]]);
    await expect(pending).resolves.toEqual({ admitted: true, oldestAt: null });
  });

  it("binds the user/action and acquires the lock before conditional admission", async () => {
    const { db, transaction } = boundary();
    const userId = "account', fake); SELECT 1; --";
    await admitUsage(db, userId, "parse_cv", 20);
    const [queries, options] = transaction.mock.calls[0];
    expect(Array.isArray(queries)).toBe(true);
    if (!Array.isArray(queries)) throw new Error("Expected query array");
    const lock = queries[1].queryData;
    const admission = queries[2].queryData;
    if (!("query" in lock) || !("query" in admission)) throw new Error("Expected bound queries");
    expect(lock.params).toEqual([JSON.stringify(["einherji:usage-quota:v1", userId, "parse_cv"])]);
    expect(admission.params.slice(1)).toEqual([userId, "parse_cv", 20, 86_400_000]);
    expect(lock.query).toContain("pg_advisory_xact_lock");
    expect(lock.query).not.toContain("usage_events");
    expect(admission.query).not.toContain(userId);
    expect(options).toMatchObject({ isolationLevel: "ReadCommitted", arrayMode: false, fullResults: false });
    expect(options?.fetchOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid limit %s", async (limit) => {
    const { db, transaction } = boundary();
    await expect(admitUsage(db, "account-a", "parse_cv", limit)).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a zero allowance without issuing SQL", async () => {
    const { db, transaction } = boundary();
    await expect(admitUsage(db, "account-a", "parse_cv", 0)).resolves.toEqual({ admitted: false, oldestAt: null });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns exhausted-window metadata", async () => {
    const { db, transaction } = boundary();
    transaction.mockResolvedValueOnce([[], [], [{ admitted: false, oldestAt: "2026-10-08T14:00:00.000Z" }]]);
    await expect(admitUsage(db, "account-a", "parse_cv", 20)).resolves.toEqual({
      admitted: false, oldestAt: new Date("2026-10-08T14:00:00.000Z"),
    });
  });

  it.each([
    { response: [] },
    { response: [[], [], []] },
    { response: [[], [], [{ admitted: "true", oldestAt: null }]] },
    { response: [[], [], [{ admitted: true, oldestAt: "invalid" }]] },
    { response: [[], [], [{ admitted: true }]] },
  ])("fails closed on a malformed response", async ({ response }) => {
    const { db, transaction } = boundary();
    transaction.mockResolvedValueOnce(response);
    await expect(admitUsage(db, "account-a", "parse_cv", 20)).rejects.toThrow();
  });

  it("propagates uncertain transport failure without another admission", async () => {
    const { db, transaction } = boundary();
    const failure = new Error("Commit outcome unknown");
    transaction.mockRejectedValueOnce(failure);
    await expect(admitUsage(db, "account-a", "parse_cv", 20)).rejects.toBe(failure);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Write service regressions.**

Create a real Drizzle instance with the same fake Neon URL. Mock `./usage.db` with `admitUsage`, `getUsageInWindow`, and a legacy `recordUsage` stub so the old implementation can run during the red check. With the clock fixed to `2026-10-09T12:00:00.000Z`, add these tests; restore the clock after each test.

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { DAILY_QUOTAS } from "./usage.validators";
import { consumeQuota, fetchQuotaStatus } from "./usage.service";

const { admitUsage, getUsageInWindow, recordUsage } = vi.hoisted(() => ({
  admitUsage: vi.fn(), getUsageInWindow: vi.fn(), recordUsage: vi.fn(),
}));
vi.mock("./usage.db", () => ({ admitUsage, getUsageInWindow, recordUsage }));
const db = drizzle(neon("postgresql://unit:unit@unit.example.invalid/test"), { schema });
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T12:00:00.000Z"));
  admitUsage.mockResolvedValue({ admitted: true, oldestAt: null });
  getUsageInWindow.mockResolvedValue({ used: 0, oldestAt: null });
  recordUsage.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); });

it("uses server-selected limits through the atomic boundary", async () => {
  admitUsage.mockResolvedValue({ admitted: true, oldestAt: null });
  await expect(consumeQuota(db, "account-a", "parse_cv")).resolves.toBeUndefined();
  expect(admitUsage).toHaveBeenCalledWith(db, "account-a", "parse_cv", DAILY_QUOTAS.parse_cv);
});

it("rejects exhaustion before provider work with the existing reset information", async () => {
  admitUsage.mockResolvedValue({ admitted: false, oldestAt: new Date("2026-10-08T14:00:00.000Z") });
  const provider = vi.fn();
  const request = async () => { await consumeQuota(db, "account-a", "parse_cv"); return provider(); };
  await expect(request()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  await expect(consumeQuota(db, "account-a", "parse_cv")).rejects.toThrow("2 hour(s)");
  expect(provider).not.toHaveBeenCalled();
});

it("propagates database failure without starting the provider", async () => {
  const failure = new Error("Commit outcome unknown");
  admitUsage.mockRejectedValue(failure);
  const provider = vi.fn();
  const request = async () => { await consumeQuota(db, "account-a", "parse_cv"); return provider(); };
  await expect(request()).rejects.toBe(failure);
  expect(provider).not.toHaveBeenCalled();
});

it("retains the quota-status fields and clamps remaining capacity", async () => {
  getUsageInWindow.mockResolvedValue({ used: 21, oldestAt: null });
  const status = await fetchQuotaStatus(db, "account-a");
  expect(status.find((entry) => entry.action === "parse_cv")).toEqual({
    action: "parse_cv", label: "CV parses", used: 21, limit: 20, remaining: 0,
  });
});
```

The setup resets both mocks, provides `{ used: 0, oldestAt: null }` for legacy reads, and makes the legacy writer resolve normally. Observe failure because the old service bypasses atomic admission, not because a mock is missing. Remove the unused legacy stub once the production writer is removed and the red result is recorded.

- [ ] **Step 3: Observe the red check.**

```powershell
rtk proxy npx --no-install vitest run src/usage/usage.db.test.ts src/usage/usage.service.test.ts
```

Confirm the new helper is missing and the existing service ignores the atomic boundary. A mock/setup error is not a valid regression result.

- [ ] **Step 4: Implement the database helper.**

Retain `getUsageInWindow`. Add the installed `createId` import and `QUOTA_WINDOW_MS` import, and replace `recordUsage` with:

```typescript
export async function admitUsage(
  db: Pick<Database, "$client">,
  userId: string,
  action: UsageAction,
  limit: number,
): Promise<{ admitted: boolean; oldestAt: Date | null }> {
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error("Invalid quota limit");
  if (limit === 0) return { admitted: false, oldestAt: null };
  const client = db.$client;
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
```

The installed SDK exposes parameterized query data for unit inspection; do not assert every SQL character. Real concurrency semantics are owned by Task 2. Keep one orienting comment explaining why lock acquisition and the conditional command are separate.

- [ ] **Step 5: Wire the existing service.**

Replace the `recordUsage` import with `admitUsage`. In `consumeQuota`, replace its `windowStart`/`getUsageInWindow` admission read with `const { admitted, oldestAt } = await admitUsage(db, userId, action, limit);`, change `if (used >= limit)` to `if (!admitted)`, and remove the final standalone `recordUsage` call. Keep the existing `TRPCError` message, `describeReset`, and `fetchQuotaStatus` code. Replace the obsolete race-acceptance comment with the new confirmed-commit contract.

- [ ] **Step 6: Verify and commit the self-contained change.**

```powershell
rtk proxy npx --no-install vitest run src/usage/usage.db.test.ts src/usage/usage.service.test.ts
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=0 SCRAPER_CANARY=0 vitest run --reporter=dot
rtk proxy npx --no-install tsc --noEmit
rtk proxy git diff --check
rtk proxy git add -- src/usage/usage.db.ts src/usage/usage.service.ts src/usage/usage.db.test.ts src/usage/usage.service.test.ts
rtk proxy git commit -m "fix(usage): serialize rolling quota admission"
rtk proxy git push -u origin feat/atomic-usage-quotas
```

Require passing output and inspect the exact staged files before commit. Do not push these product changes to `main` or mark real concurrency verified.

## Task 2 - Safe Real-Database Verification And Release Gate

**Files:** Create the test-target helper and its unit test; replace the quota integration suite setup/scenarios; create the operating record and update the roadmap.

**Interfaces:** `resolveUsageTestTarget(values: Record<string, string | undefined>): string | null` returns a disposable URL only after validation. Integration code constructs `drizzle(neon(target), { schema })`, passes that instance to the unchanged service, and never imports the global database value.

- [ ] **Step 1: Write and observe failing target-guard tests.**

```typescript
import { expect, it } from "vitest";
import { resolveUsageTestTarget } from "./__tests__/usage-test-target";

const personal = "postgresql://owner:secret@ep-owner.region.neon.tech/app";
const target = "postgresql://test:secret@ep-test.region.neon.tech/test";
const configured = {
  SCRAPER_INTEGRATION: "1", USAGE_TEST_ALLOW_WRITES: "1",
  DATABASE_URL: personal, USAGE_TEST_DATABASE_URL: target,
};

it("skips default runs before parsing any target", () => {
  expect(resolveUsageTestTarget({})).toBeNull();
});
it("requires an explicit disposable write acknowledgment", () => {
  expect(() => resolveUsageTestTarget({ ...configured, USAGE_TEST_ALLOW_WRITES: "0" })).toThrow();
});
it.each(["DATABASE_URL", "USAGE_TEST_DATABASE_URL"])("requires %s", (key) => {
  expect(() => resolveUsageTestTarget({ ...configured, [key]: undefined })).toThrow();
});
it.each([personal, "postgresql://other:other@ep-owner-pooler.region.neon.tech/app",
  "postgresql://other:other@ep-owner.region.neon.tech/%61pp"])("rejects the personal database through aliases", (url) => {
  expect(() => resolveUsageTestTarget({ ...configured, USAGE_TEST_DATABASE_URL: url })).toThrow();
});
it.each(["https://example.test/db", "not-a-url", "postgresql://host/"])("rejects an invalid target", (url) => {
  expect(() => resolveUsageTestTarget({ ...configured, USAGE_TEST_DATABASE_URL: url })).toThrow();
});
it("returns only the explicitly configured disposable URL", () => {
  expect(resolveUsageTestTarget(configured)).toBe(target);
});
it("does not put credentials in its error", () => {
  let failure: unknown;
  try {
    resolveUsageTestTarget({ ...configured, USAGE_TEST_DATABASE_URL: personal });
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(Error);
  expect(String(failure)).not.toContain("secret");
  expect(String(failure)).not.toContain(personal);
});
```

Use Vitest imports and import the exact helper path `./__tests__/usage-test-target`. Run `rtk proxy npx --no-install vitest run src/usage/usage-test-target.test.ts` and confirm the helper is absent before implementation.

- [ ] **Step 2: Implement the pure test guard.**

```typescript
export function resolveUsageTestTarget(values: Record<string, string | undefined>): string | null {
  if (values.SCRAPER_INTEGRATION !== "1") return null;
  if (values.USAGE_TEST_ALLOW_WRITES !== "1") throw new Error("Disposable usage-test writes require acknowledgment");
  function identity(raw: string | undefined, name: string): string {
    try {
      if (!raw) throw new Error();
      const url = new URL(raw);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname === "/" || !url.pathname) throw new Error();
      return JSON.stringify([
        url.hostname.toLowerCase().replace(/-pooler(?=\.)/, ""),
        url.port || "5432", decodeURIComponent(url.pathname.slice(1)),
      ]);
    } catch {
      throw new Error(`Valid ${name} is required for disposable usage tests`);
    }
  }
  const personal = identity(values.DATABASE_URL, "DATABASE_URL");
  const disposable = identity(values.USAGE_TEST_DATABASE_URL, "USAGE_TEST_DATABASE_URL");
  if (personal === disposable) throw new Error("Usage tests cannot write to the personal database");
  return values.USAGE_TEST_DATABASE_URL!;
}
```

The acknowledgment remains necessary: endpoint comparison cannot identify every possible database alias. No URLs are printed by the guard.

- [ ] **Step 3: Replace integration setup with a dedicated guarded client.**

Retain the integration test filename but remove the old `SCRAPER_TEST_USER_ID` gate, global database imports, shared users, and order-dependent cases. Load `.env.test.local`, `.env.local`, and `.env` through installed dotenv with `quiet: true`, without overriding existing process variables. Initialize the test client only after `resolveUsageTestTarget(process.env)` returns a URL. Use `describe.skip` when it returns null; when explicit integration opt-in is unsafe, let validation fail before a client is constructed.

Use this fixture implementation with the normal Vitest, Neon, Drizzle, dotenv, CUID, `inArray`, schema, and usage-module imports:

```typescript
import { afterAll, describe, expect, it, vi } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import { config } from "dotenv";
import { createId } from "@paralleldrive/cuid2";
import { setTimeout as delay } from "node:timers/promises";
import * as schema from "@/lib/db/schema";
import { consumeQuota, fetchQuotaStatus } from "./usage.service";
import { DAILY_QUOTAS, QUOTA_WINDOW_MS, type UsageAction } from "./usage.validators";
import { resolveUsageTestTarget } from "./__tests__/usage-test-target";

config({ path: [".env.test.local", ".env.local", ".env"], quiet: true });
const target = resolveUsageTestTarget(process.env);
const testDb = target ? drizzle(neon(target), { schema }) : null;
const describeQuota = target ? describe : describe.skip;
const fixtureIds = new Set<string>();
function database() {
  if (!testDb) throw new Error("Disposable usage database not configured");
  return testDb;
}
async function newUser(id = createId()) {
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
afterAll(async () => {
  if (testDb && fixtureIds.size) {
    await testDb.delete(schema.users).where(inArray(schema.users.id, [...fixtureIds]));
  }
});
```

Only captured fixture IDs are deleted. Do not seed, migrate, or truncate the personal database. The test target must already have compatible schema provisioned using an explicitly targeted separate connection.

- [ ] **Step 4: Add the real-database scenarios inside `describeQuota`.**

Use an explicit 120-second timeout per scenario; never run them without the disposable target and acknowledgment.

```typescript
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
  const id = createId();
  const provider = vi.fn();
  const request = async () => { await consumeQuota(database(), id, "parse_cv"); return provider(); };
  await expect(request()).rejects.toThrow();
  expect(provider).not.toHaveBeenCalled();
  expect(await persisted(id, "parse_cv")).toBe(0);
  await newUser(id);
  await expect(consumeQuota(database(), id, "parse_cv")).resolves.toBeUndefined();
  expect(await persisted(id, "parse_cv")).toBe(1);
}, 120_000);
```

- [ ] **Step 5: Add a lock-wait regression that proves the snapshot boundary.**

Import `setTimeout` as `delay` from `node:timers/promises`. Use the same namespaced lock key as admission. Observe both the granted holder and the blocked contender in `pg_locks`; a sequential result without an observed wait is insufficient.

```typescript
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
```

If network latency prevents observing the deliberate three-second hold, report that test limitation; do not turn this into a sequential test or remove the assertion. Adjust test orchestration within the five-second product lock timeout only after examining real output.

- [ ] **Step 6: Run available checks, document the live gate, commit and push.**

```powershell
rtk proxy npx --no-install vitest run src/usage/usage.db.test.ts src/usage/usage.service.test.ts src/usage/usage-test-target.test.ts
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=0 SCRAPER_CANARY=0 vitest run --reporter=dot
rtk proxy npx --no-install tsc --noEmit
rtk npm run lint
rtk npm run build
rtk proxy git diff --check
rtk proxy git add -- src/usage/__tests__/usage-test-target.ts src/usage/usage-test-target.test.ts src/usage/usage.integration.test.ts docs/ATOMIC-USAGE-QUOTAS.md docs/SAAS-PHASED-PLAN.md
rtk proxy git commit -m "test(usage): isolate quota concurrency verification"
rtk proxy git push origin feat/atomic-usage-quotas
```

In `docs/ATOMIC-USAGE-QUOTAS.md`, record actual default counts, type/lint/build output, the five/ten/twenty-second limits, no automatic retries for unknown commits, fixture-cleanup scope, and these required local variables: `DATABASE_URL`, `USAGE_TEST_DATABASE_URL`, `USAGE_TEST_ALLOW_WRITES=1`. Never include their secret values. The roadmap must say implementation is pending real concurrency verification if that verification cannot run.

- [ ] **Step 7: Run real verification only after a disposable target is supplied and acknowledged.**

With the variables configured locally and test schema already provisioned:

```powershell
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=1 SCRAPER_CANARY=0 vitest run src/usage/usage.integration.test.ts
```

Run only that file, not the general integration script against a mixture of personal and test targets. Missing/unsafe configuration must fail before writes. Record every concurrency result and verify fixture cleanup. If the target is unavailable, leave this step unchecked and report the exact missing prerequisite; no personal-database substitution.

- [ ] **Step 8: Record release readiness, commit and push the evidence.**

Once all real scenarios pass, update the operating record and roadmap with actual output and date, then commit those two documents with `docs: record verified atomic quota admission` and push the feature branch. Do not mark the shared-budget portion of Phase 2 complete.

Before integration into deployment-tracking `main`, confirm the rollout will drain or pause old quota writers and that deployment is intended. A Git push of the feature branch is not permission to merge or deploy unverified changes. Attach any PR actually created to this task; PR creation is not required merely to write this plan.

## Completion Checklist

- [ ] Product admission uses a fresh post-lock snapshot and confirms commit before provider work.
- [ ] User/action limits and rolling-window history are preserved; the legacy writer has no callers.
- [ ] Invalid limits, malformed responses, transport failure, and service rejection fail closed.
- [ ] Safe-target guard tests and all default checks pass.
- [ ] Real last-unit, exhausted, lock-wait, isolation, expiry, provider-failure, and SQL-error cases pass on the disposable target.
- [ ] Fixture cleanup and rollout constraints are recorded.
- [ ] Scoped commits are pushed; questionnaire edits are untouched.

Plan review precedes execution. Native/inline execution remains the chosen project approach; no new delegation or service setup is required to approve this plan.
