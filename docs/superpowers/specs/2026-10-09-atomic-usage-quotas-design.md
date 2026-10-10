# Atomic Usage Quotas Design

**Date:** 2026-10-09

**Status:** Implemented and verified on 2026-10-10; see the [execution record](../../ATOMIC-USAGE-QUOTAS.md).

**Approved execution amendments:** The user explicitly permitted fixture-only main-database tests on 2026-10-10 and separately approved applying existing pending migration `0016`. Default target safety remains, with a separate `USAGE_TEST_ALLOW_MAIN_DATABASE=1` opt-in for the approved exception. The core admission design, limits, and caller interfaces are unchanged.

**Scope:** The next slice of [SaaS Phase 2](../../SAAS-PHASED-PLAN.md). Shared monetary budgets remain a separate design.

## Goal

When concurrent requests compete for the final allowance for one user and action, exactly one may be admitted. Preserve the existing rolling 24-hour policy, quota values, account ownership, and usage history. Expensive work must only start after a confirmed admission commit.

This is an admission fix, not a public-launch readiness claim. Registration stays closed and the previously implemented model funding allowlists remain unchanged.

## Existing Boundaries

- `src/usage/usage.service.ts` exposes `consumeQuota(db, userId, action)` to the application services and `fetchQuotaStatus` to the UI.
- `src/usage/usage.db.ts` currently checks the count and inserts an event in separate calls. The race is in this shared boundary, not in each caller.
- `src/lib/db/schema.ts` already has indexed, user-owned `usage_events` rows. No new table, migration, or history rewrite is needed for this slice.
- `src/lib/db/index.ts` uses Drizzle's Neon HTTP driver. Interactive transaction callbacks are unsupported, but the existing `db.$client` exposes Neon's non-interactive transaction API with explicit isolation options.
- All seven actions reach `consumeQuota`: message generation, CV parsing, manager searches, scraping, job-fact extraction, fit reports, and generated documents. Batch extraction consumes one allowance per job.

Current quotas remain 50 messages, 20 CV parses, 25 manager searches, 50 scrapes, 200 job analyses, 50 fit reports, and 50 documents per rolling 24 hours. Smaller pilot allowances are separate work; do not reduce the personal account's limits as part of this fix.

## Options And Decision

**Recommended: transaction-scoped advisory lock plus conditional admission through the existing Neon client.** This keeps the driver, schema, usage history, and public service interface. Requests for the same user/action serialize only during admission, not during provider work.

**Alternative: a counter or reservation table.** Conditional row updates can implement admission, but a simple calendar-day counter changes rolling-window behavior. A reservation ledger belongs with later shared-cost accounting and is unnecessary for this race fix.

**Alternative: replace the connection with an interactive transaction driver.** This permits conventional transaction callbacks but changes connection handling across the application. The installed Neon HTTP client already supplies the transaction mechanism this slice needs.

Do not use process-local locks: separate serverless instances would still race. Do not use a lock and count inside one SQL command: that command's snapshot may predate the previous holder's commit.

## Admission Contract

`consumeQuota(db, userId, action)` retains its signature and successful `undefined` return value. It obtains the action's limit from the existing server-owned `DAILY_QUOTAS` values.

Replace the unrestricted `recordUsage` helper with one atomic admission helper in `usage.db.ts`. Its inputs are the database, authenticated user ID, typed action, and server-selected nonnegative safe-integer limit. Its result identifies whether admission occurred and the oldest event in the evaluated window, for the existing exhaustion message. Reject invalid limits before issuing SQL. Zero allowance always rejects without inserting an event. Missing or malformed admission results must fail closed, never authorize work.

Successful admission records exactly one event. Exhaustion returns a `TOO_MANY_REQUESTS` error without inserting. A database error never authorizes provider work and must not be converted into success or a quota-exhaustion response.

`getUsageInWindow` and the existing quota-status response shape remain available. UI status is a snapshot, not a reservation or guarantee that another request cannot consume the last allowance.

## Transaction Sequence

Use `db.$client.transaction(...)` with explicit `isolationLevel: "ReadCommitted"`. Construct the query promises and pass them to the transaction; do not await or execute them individually first.

1. Set transaction-local `lock_timeout` to five seconds and `statement_timeout` to ten seconds.
2. Acquire `pg_advisory_xact_lock` using a stable 64-bit database hash of a namespaced JSON tuple containing the user ID and action. Bind the tuple as a SQL parameter; do not build SQL from user input. A hash collision only serializes unrelated admissions; it cannot transfer quota or ownership.
3. In a subsequent SQL command, count this user's events for this action in the rolling window and conditionally insert one event only when the count is below the limit. Return the admission decision and window metadata from that command.
4. Wait for the HTTP transaction to report a successful commit before resolving admission to the caller. The transaction-scoped lock is then released automatically.

In the conditional-admission command, capture the database wall clock once, after lock acquisition, and use it for both the window boundary and explicit event timestamp. Preserve the existing timestamp-column semantics and inclusive lower-bound comparison. Do not use the request's start time, the application clock, or transaction-start `now()` to date an event after waiting for the lock.

Generate the event ID with the existing CUID library because raw SQL does not invoke Drizzle's application-side `$defaultFn`. All IDs, actions, limits, and interval values must be parameterized. Do not return or log credentials or other users' metadata.

The lock and conditional admission must remain separate commands. At `ReadCommitted`, the later command gets a fresh snapshot that includes the previous holder's committed event. Request B therefore sees the event recorded by request A before deciding whether capacity remains. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [transaction-scoped locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).

The request uses a twenty-second HTTP abort signal in addition to the database timeouts. The abort is a client-side bound, not proof that a remote transaction rolled back. No transaction remains open during an AI completion, source fetch, or Apify operation.

## Failure And Retry Rules

- A provider failure after admission does not refund the allowance: the attempt may have incurred a charge.
- A timeout or lost HTTP response can leave the commit outcome unknown. Fail closed: do not start provider work and do not automatically retry admission. An event may remain counted even though no provider work followed.
- A subsequent user-triggered retry is a new attempt, subject to the same quota. This slice does not add request idempotency or promise exactly-once provider execution.
- An SQL error aborts the transaction; do not continue with a separate insert or an in-memory fallback.
- Keep read-only saved data and quota-status queries available when admission is rejected.

Funding-policy validation currently happens after quota consumption in some services. That ordering remains explicitly outside this race fix; correcting it belongs to the funded-admission integration slice. Do not silently claim that model-policy rejections become free of quota consumption here.

## Files And Compatibility

Expected product changes are limited to `src/usage/usage.db.ts` and `src/usage/usage.service.ts`. Tests cover the database boundary and service behavior; usage documentation records evidence and limitations.

Do not change schema, migrations, model configuration, registration policy, provider keys, personal seeds, quota values, or callers' interfaces. Every production writer of quota events must use the new admission helper; remove the old unrestricted writer once its caller is replaced.

During rollout, old application instances may still write without taking the new lock. Pause expensive actions or drain old requests before claiming the new ceiling is strict. Rolling back to the old implementation restores the known concurrency race; do not describe that rollback as quota-safe.

## Verification And Safe Test Target

Default tests must keep database integration and live-source modes off. Unit tests can verify service rejection, accepted admission, invalid limits, missing/malformed admission results, and error propagation, but cannot prove PostgreSQL concurrency.

Prefer a disposable Neon test database populated with schema and throwaway fixtures only. The executed verification used the main database under the explicit amendment above; an instruction merely to continue development is not permission to reuse that exception.

The quota integration suite constructs its own guarded database instance from `USAGE_TEST_DATABASE_URL`, with `SCRAPER_INTEGRATION=1` and `USAGE_TEST_ALLOW_WRITES=1` as opt-ins. It never imports the global application database value. Only explicit `USAGE_TEST_ALLOW_MAIN_DATABASE=1` permission permits using `DATABASE_URL` as its target or fallback. Keep credentials in local environment configuration, not committed files or chat.

Before any test write, require the personal `DATABASE_URL` for comparison and reject a matching normalized endpoint/database identity unless main permission is explicit, accounting for pooled versus direct Neon endpoints and ignoring credentials. Never print either connection string. Identity comparison cannot recognize every alias; operator acknowledgment remains necessary. Missing configuration skips normal runs; explicitly requested runs with missing or unsafe configuration fail without writes.

Create independent throwaway users per scenario and clean up only those recorded fixture IDs. Do not truncate tables, reuse the personal user ID, apply migrations through the default production-configured command, or depend on test execution order. Provision the test schema separately with an explicitly targeted connection.

Required real-database scenarios:

1. Seed `limit - 1` current events, launch twenty admissions for the same user/action concurrently, and assert exactly one success, nineteen quota rejections, and exactly `limit` persisted events.
2. Seed a full allowance and assert every concurrent request rejects without adding rows.
3. Race against the same user/action when the previous holder has not committed yet; verify the contender waits and then observes the newly committed event. The test must exercise the wait, not merely issue sequential calls.
4. Verify one user's exhausted allowance does not reject another user's admission and one action's exhaustion does not reject another action.
5. Verify events older than the rolling window stop consuming capacity and pre-existing in-window events remain counted.
6. Verify an admitted provider failure stays counted and admission/database failure prevents the mocked provider from starting.
7. Verify rollback/error handling leaves no successful admission result and does not leave a transaction-scoped lock held after the transaction ends.
8. Verify quota-status fields and exhaustion/reset messages remain compatible.

Full default tests and TypeScript must pass after implementation; rerun lint and production build for the product-code changes. Record real integration output separately from skipped default coverage. Do not mark atomic quotas complete, enable public signup, or enable funded pilot workloads before the concurrency checks actually pass.

## Next Step

The [focused implementation plan](../plans/2026-10-09-atomic-usage-quotas.md) has been executed with the approved amendments. Shared request ceilings, monetary reservations/reconciliation, verified accounts, pilot allowances, and bounded provider retries remain later Phase 2 work.
