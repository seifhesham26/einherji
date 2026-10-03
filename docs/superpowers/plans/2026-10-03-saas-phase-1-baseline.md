# Einherji SaaS Phase 1 Baseline Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Phase 1 was completed on 2026-10-03; checked items reflect verified execution below.

**Goal:** Establish a reproducible test baseline for the individual-user SaaS conversion.

**Architecture:** Reuse the existing Wuzzuf parser, fixtures, relative-date helper and Vitest harness. Control the clock inside the Wuzzuf fixture suite and create the parsed fixture after setting that clock. Record current readiness using existing project checks.

**Tech Stack:** TypeScript, Vitest 4.1.10, Next.js 16.2.6, existing npm scripts.

**Spec:** [Working brief and Phase 1 scope](C:/dev/einherji/docs/SAAS-PHASED-PLAN.md).

## Global Constraints

- Existing user-owned data and identifiers must be preserved.
- Database migrations and source/provider calls are outside Phase 1 execution.
- User ownership remains the tenant model.
- Registration remains closed during Phase 1.
- Default verification explicitly disables database and live-source test modes.
- The Wuzzuf fix controls test time without changing production posting-date semantics.
- Use the installed Next.js documentation before changing Next.js APIs or configuration.

## Review Focus

- A fixture containing `posted 19 days ago` must give the exact expected date at a controlled reference time.
- Parsing at a different reference time must remain relative to that time, rather than being anchored to the fixture sitemap date.
- Timer mocks must be installed before fixture parsing and restored after each test.
- Existing company-name, description, work-type, remote and missing-page assertions must remain effective.
- Default checks must not enable integration or live-source modes inherited from a developer shell.

## Task 1 - Make The Fixture Date Test Deterministic

**Modify:** `C:/dev/einherji/src/lib/scrapers/aggregators/wuzzuf.test.ts`.

**Read:** `C:/dev/einherji/src/lib/scrapers/aggregators/wuzzuf.ts`, `C:/dev/einherji/src/lib/scrapers/parse-relative-date.ts`, and `C:/dev/einherji/src/lib/scrapers/aggregators/__fixtures__/wuzzuf-job-page.ts`.

**Existing interfaces:** `parseWuzzufJobPage(html, jobUrl, lastModified)` returns a parsed job or `null`; its `postedAt` comes from `parseRelativeDate` when the header contains a relative age. The fixture header says `posted 19 days ago`. Preserve those production interfaces.

- [x] **Step 1: Reproduce the current failure.**

Run from `C:/dev/einherji`:

```powershell
rtk proxy npx --no-install vitest run src/lib/scrapers/aggregators/wuzzuf.test.ts
```

Expected at the recorded baseline: the assertion comparing a real-clock posting date to the fixed August sitemap date fails. If the current code has since changed, inspect its new behavior before applying this patch.

- [x] **Step 2: Replace the imprecise posting-age assertion with an exact regression.**

Replace the existing `prefers the posted age in the header over the sitemap lastmod` test with:

```typescript
it("prefers the posted age in the header over the sitemap lastmod", () => {
  expect(job?.postedAt).toBeInstanceOf(Date);
  expect(job?.postedAt?.toISOString()).toBe("2026-08-03T12:00:00.000Z");
});
```

Run the focused command again. Before the clock setup below, the date should fail to match the fixed expected value; this confirms the regression exercises the dependency on time.

- [x] **Step 3: Set the clock before parsing and restore it afterward.**

Change the Vitest import to:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
```

Inside the existing `describe("parseWuzzufJobPage", ...)`, replace the eager `const job = parseWuzzufJobPage(...)` declaration with:

```typescript
let job: ReturnType<typeof parseWuzzufJobPage>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
  job = parseWuzzufJobPage(WUZZUF_JOB_PAGE_HTML, JOB_URL, SITEMAP_LASTMOD);
});

afterEach(() => {
  vi.useRealTimers();
});
```

Keep the remaining existing tests in that suite. The sitemap parsing and URL filtering suites need no clock changes.

- [x] **Step 4: Verify parsing remains relative at other reference dates.**

Add this test to the same suite:

```typescript
it.each([
  ["2026-10-03T12:00:00.000Z", "2026-09-14T12:00:00.000Z"],
  ["2030-01-20T12:00:00.000Z", "2030-01-01T12:00:00.000Z"],
])("interprets the posted age relative to %s", (now, expected) => {
  vi.setSystemTime(new Date(now));

  const parsed = parseWuzzufJobPage(
    WUZZUF_JOB_PAGE_HTML,
    JOB_URL,
    SITEMAP_LASTMOD,
  );

  expect(parsed?.postedAt?.toISOString()).toBe(expected);
});
```

This protects production date semantics while the fixture suite itself uses a stable clock.

- [x] **Step 5: Run focused verification.**

```powershell
rtk proxy npx --no-install vitest run src/lib/scrapers/aggregators/wuzzuf.test.ts src/lib/scrapers/parse-relative-date.test.ts
```

Expected: both files pass, including existing parsing regressions and the two additional reference-date cases. A failing result must be understood before continuing; do not weaken date assertions or update the fixture to the current calendar date.

## Task 2 - Verify And Record The Baseline

**Modify:** `C:/dev/einherji/docs/SAAS-PHASED-PLAN.md`.

**Deliverable:** Current verification evidence and an accurate Phase 1 status. This is documentation and verification work; it does not require new product tests.

- [x] **Step 1: Run the full default suite with external modes disabled.**

```powershell
rtk proxy npx --no-install cross-env SCRAPER_INTEGRATION=0 SCRAPER_CANARY=0 vitest run --reporter=dot
```

Expected: zero failing default tests. Integration and canary skips are expected for this command and must remain visible in the record. Do not enable them against the personal database to reduce the skip count.

- [x] **Step 2: Type-check the changed test code.**

```powershell
rtk proxy npx --no-install tsc --noEmit
```

Expected: exit code zero.

- [x] **Step 3: Review the change and record actual results.**

```powershell
rtk proxy git diff -- src/lib/scrapers/aggregators/wuzzuf.test.ts docs/SAAS-PHASED-PLAN.md
rtk git status --short
```

Update the roadmap's baseline test counts and check date from the completed runs. Mark the Phase 1 tasks complete only after their outcomes are verified, and set Phase 2 as ready when Phase 1 exits. Keep later phases marked as planned.

The type, lint and build checks performed while writing the plan passed, with the documented lint and Sentry warnings. If execution changes production files, configuration or dependencies in addition to this test, rerun the relevant checks:

```powershell
rtk npm run lint
rtk npm run build
```

- [x] **Step 4: Record the release prerequisite.**

Keep the isolated-database integration gate in the roadmap. The default suite's skipped isolation, usage and lifecycle tests do not prove readiness for multiple public users. Running those checks becomes part of the relevant implementation phases and the pilot release gate.

## Completion

- [x] The Wuzzuf date test passes independently of the host calendar date.
- [x] Parsing at later reference dates returns later posting dates, preserving live behavior.
- [x] The full default suite has no failing tests.
- [x] TypeScript passes.
- [x] Baseline warnings and skipped integration coverage are accurately recorded.
- [x] Changes are limited to the fixture test and readiness documentation.

## Execution Record - 2026-10-03

| Check | Observed Result |
| --- | --- |
| Original Wuzzuf test | Reproduced the posting-age failure: 12 passed, one failed. |
| Exact assertion before clock fix | Failed with a real-clock September date instead of the expected August date. |
| Focused parser/date tests after clock fix | 20 passed across two files; exit code zero. |
| Full default suite, external modes disabled | 377 passed, zero failed, 64 skipped; 38 files passed, 10 skipped; exit code zero. |
| TypeScript | `tsc --noEmit` exited zero after the test change. |
| Build and lint | Reused earlier checks from the planning session; no production/configuration/dependency changes. Known React Compiler and Sentry warnings remain in the roadmap. |

Only the Wuzzuf fixture test and these readiness documents were changed during execution. Existing questionnaire edits were preserved. No migrations, provider/source requests, or signup changes were performed. Isolated-database integration and live-source coverage remain unverified release gates.

The next implementation plan should cover Phase 2 server-side funding policy and quota/budget admission, using the working defaults in the roadmap. The remaining discovery answers can be refined when they affect that work.
