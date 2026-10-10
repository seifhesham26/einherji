# Atomic Usage Quotas

**Verified:** 2026-10-10. This completes the per-user/action atomic-admission slice, not all of SaaS Phase 2.

## Behavior

The existing rolling 24-hour limits and usage history are preserved. All expensive-action callers continue to use `consumeQuota(db, userId, action)`.

The shared admission helper uses a Neon HTTP transaction with explicit `ReadCommitted` isolation. It acquires a transaction-scoped lock for the user/action before a separate conditional-insert command, so a waiting request sees the previous holder's committed event. It captures the database clock after the lock and records one event only when capacity remains. Provider work starts only after confirmed commit.

Lock, statement, and HTTP timeouts are five, ten, and twenty seconds respectively. SQL/transport failures and malformed responses fail closed. Admission is not automatically retried when commit outcome is unknown; an event may remain counted without provider work. Provider failure after admission does not refund its allowance.

The quota-status response and exhaustion/reset behavior remain compatible. Status is a snapshot, not a reservation. Funding eligibility still occurs after consumption in some services; correcting that order, shared budgets, verification rules, smaller pilot allowances, and bounded provider retries remain later Phase 2 work.

## Verification Results

| Check | Result |
| --- | --- |
| Baseline before this change | 397 default tests passed, 64 skipped. |
| Admission/service regressions before implementation | 18 failed, one passed, as expected. |
| Admission/service unit tests after implementation | 19 passed. |
| Test-target guard unit tests | 16 passed, including direct/pooled aliases and explicit main-target permission. |
| Full default suite | 432 passed, zero failed, 66 skipped; 42 files passed, 10 skipped. |
| Live quota suite | Seven passed, including one winner among twenty final-unit contenders and an observed lock wait. |
| Fixture cleanup | Zero matching fixture users remain; usage rows cascade with their users. |
| TypeScript | `tsc --noEmit` passed. |
| Lint | Zero errors; existing React Hook Form/React Compiler warning remains. |
| Production build | Passed on Next.js 16.2.6; existing Sentry `disableLogger` deprecation warnings remain. |
| Dependency audit | 44 reported vulnerable packages, including two critical-rated packages: `next` and `proxy-addr`. Dependencies unchanged; applicability/remediation not assessed in this patch. |

The default suite explicitly disables database integration and live-source modes. The seven live quota checks were run separately; the other skipped integration/source tests are not claimed to have passed.

## Database Authorization And Migration

The original design required a disposable database. On 2026-10-10, the user explicitly authorized fixture-only verification against the main database. Default protection remains: main-target writes require both `USAGE_TEST_ALLOW_WRITES=1` and `USAGE_TEST_ALLOW_MAIN_DATABASE=1`, in addition to integration opt-in.

The first live run passed five checks and failed two because the database lacked existing migration `0016_good_the_hunter`. Inspection confirmed it was the only pending migration, the new usage actions were absent, and the document/fit-report tables did not exist.

With separate user approval, the existing additive migration and its journal entry were applied in one Neon transaction. No new migration file was created, no tables were truncated, and existing account/job records were not deleted. A follow-up inspection found all seven usage actions, both new tables, and no pending migrations. The subsequent seven-case live suite passed.

Cleanup is constrained to recorded, generated `quota-test-` IDs whose name and email also match the test fixture identity. No personal account ID is used. Real AI/Apify/source work is mocked, not invoked.

## Running Quota Tests

Normal local verification makes no integration writes:

```powershell
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=0 SCRAPER_CANARY=0 vitest run --reporter=dot
```

Prefer a dedicated test target. Configure `USAGE_TEST_DATABASE_URL`, the personal `DATABASE_URL` for identity comparison, and `USAGE_TEST_ALLOW_WRITES=1` locally in an ignored environment file. Provision matching schema explicitly; do not use the production-configured migration command on an unconfirmed test target.

```powershell
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=1 SCRAPER_CANARY=0 vitest run src/usage/usage.integration.test.ts
```

Only when the operator has explicitly approved main-database fixture writes, the suite can use `DATABASE_URL` with no separate target:

```powershell
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=1 SCRAPER_CANARY=0 USAGE_TEST_ALLOW_WRITES=1 USAGE_TEST_ALLOW_MAIN_DATABASE=1 vitest run src/usage/usage.integration.test.ts
```

Run only the quota file for that permission, not the broad integration script. Never commit or print connection strings. Main permission does not authorize schema migrations, truncation, or cleanup of other records. An interruption can leave test-owned rows; inspect ownership before any manual cleanup.

## Rollout And Review

The operator approved merging and pushing to main after verification. Old application requests must drain during deployment: they do not acquire the new lock. Reverting to the old admission code restores the concurrency race.

The branch was reviewed inline because no native reviewer subagent was available. The review checked parameter binding, separate lock/read commands, failure propagation, test-target safety, fixture-only cleanup, unchanged callers/limits, and absence of secret files in staged changes.

The execution ledger was kept in ignored dependency-cache storage instead of Bash-only skill scripts on Windows. Its relevant evidence and approved exceptions are recorded here. This affects bookkeeping, not admission behavior.

Before a public pilot, address the dependency audit, implement shared funding budgets and verified-account admission, and complete the remaining tenant/asset lifecycle tests. Atomic user quotas alone do not bound aggregate provider spending.
