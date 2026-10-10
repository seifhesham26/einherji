# Einherji SaaS Phased Plan

**Date:** 2026-10-03  
**Status:** Phase 1 complete; Phase 2 funding policy and atomic user quotas verified, remaining controls planned

**Current phase:** 2 - Affordable usage (partially implemented)

## Working Brief

Build a useful, affordable job-search product for individual users using the existing application. The first release should turn a CV and job preferences into a relevant shortlist, reviewed application material, and application progress. The broader discovery vision can grow through additional product stages once this workflow is useful and sustainable.

This plan uses the saved discovery answers and reasonable defaults for unanswered questions. The defaults below are planning recommendations, not claims that you already answered every question. Completing the questionnaire is not a prerequisite for Phase 1.

| Decision | Working Default | Basis |
| --- | --- | --- |
| Public name | Einherji | Your answer. |
| Initial customer | Individual job seekers; recruit software developers for the first pilot. | Individual-first preference; developer cohort is a recommendation. |
| Languages | English and Arabic throughout the first public workflow, including RTL layout and document language. | Your requirement. |
| Geography | Global account availability; discovery coverage is limited to actual supported sources. | Your preference, with an explicit coverage boundary. |
| Access | Free private pilot of 10 users, reviewed after four weeks; capped public beta afterward. | Recommended starting point. |
| Ownership | Keep existing user-owned data; add workspaces when shared team use requires them. | Fits the first customer and current code. |
| Weekly capacity | Plan around five hours, including maintenance and support. | Provisional scheduling assumption; no deadline promised. |
| Operating budget | Provisional ceiling of US$40/month in recurring service costs, with at most US$10 allocated to paid AI/discovery. Domain registration is separate. | Recommended initial ceiling, to be checked against actual provider costs before launch. |
| Cost recovery | Keep the useful core free where sustainable; evaluate paid expensive actions after the pilot measures their cost. | Your motivation; payment behavior is deferred until evidence exists. |
| Applications | Users review drafts and apply through the original application channel; track status manually. | Your approval requirement and existing tracking model. |
| Personal data | Preserve your account and explicit personal seed script; new accounts receive generic or empty defaults. | Avoids destructive migration and unrelated personal onboarding data. |
| Implementation approach | One implementer, one independently verifiable task at a time. | Fits a small project and limited weekly time. |

The budget is a design ceiling, not a price estimate or a provider purchase. If the selected hosting and services exceed it, reduce the pilot workload or revisit the ceiling before enabling those services. Vercel remains the preferred host; its Hobby plan is restricted to personal, non-commercial use, so hosting eligibility must be checked for the actual offering. [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

## First Release

The working journey is: controlled account creation; upload a CV or enter a profile manually; review extracted facts and preferences; discover jobs or paste a job description; save a shortlist; request an explained fit report; review application documents; apply externally; update application progress and request interview preparation.

### Reuse The Existing Capabilities

| Capability | Current State | Planned Work |
| --- | --- | --- |
| Authentication | Better Auth, login, registration and verification surfaces exist; registration is closed. | Controlled pilot access, recovery, and verification rules for funded actions. |
| Profile | Criteria can be saved manually or extracted from a CV. | Reliable owned uploads, confirmation, and localization. |
| Job shortlist and tracking | Jobs, buckets, notes, status history, filtering and scoring exist. | Focus the public journey and add manual job entry. |
| Fit reports | Requirement-by-requirement evidence and `matchPercent` exist. | Keep the interpretation as fit, with bounded funded usage. |
| Application documents | Cover letters, answers, CV bullets and interview preparation exist. | Reuse these workflows; add language selection and review where needed. |
| Discovery | Source registry, adapters, rate limits and persisted scrape runs exist. | Review a small source set and make multi-source execution durable. |
| Usage | Per-user rolling quotas exist. | Public allowances, atomic admission, model funding policy and shared budget controls. |
| Uploaded CV lifecycle | Upload completion returns a URL; an owned asset record is missing. | Asset ownership, private access, export and deletion. |
| Personal starter data | Explicit seed script contains personal buckets and pitches. | Keep it explicit; create separate generic onboarding behavior. |

Manual job entry is a new capability: the current jobs router has no create/import mutation. Application tracking and interview preparation are existing capabilities and should be reused.

### Expansion Backlog

Recruiter and agency operations, team workspaces, client and supplier discovery, a general chatbot, automatic application submission, extensive integrations, arbitrary profile-field builders, and subscription billing belong to later stages. Preserve useful existing code and personal workflows without making them dependencies of the first public experience.

## Phases At A Glance

| Phase | Deliverable | Exit Condition | Depends On |
| --- | --- | --- | --- |
| 1. Reproducible baseline | Stable local checks and an accurate readiness record. | Date-dependent failure fixed; default tests pass; build/type/lint evidence recorded. | Current code. |
| 2. Affordable usage | Server-enforced funding rules, fair allowances and a shared budget. | Unfunded models and exhausted limits are rejected before provider work, including concurrent requests. | Phase 1. |
| 3. Account and document lifecycle | Controlled account lifecycle, owned CVs, private access, export and deletion. | Two isolated users cannot read or change each other's assets; deletion and recovery work. | Phases 1-2. |
| 4. Individual user journey | English/Arabic onboarding, manual job entry, shortlist, documents and tracking. | A fresh user completes the journey in both languages without needing scraping to succeed. | Phases 2-3. |
| 5. Reliable initial discovery | A reviewed source set and recoverable background scrape execution. | A source failure or repeated queue delivery leaves coherent progress and no duplicate results or unbounded funded work. | Phases 2-4. |
| 6. Free pilot | Ten real users, minimal operational visibility and four weeks of feedback. | Measured usefulness, repeat use, cost and support load support a launch decision. | Phases 1-5 and pilot readiness checks. |
| 7. Capped public beta | Broader controlled access and a reviewed operating policy. | Admission limits, ongoing budget controls and lifecycle behavior work at the measured workload. | Pilot evidence. |

Each phase should get a focused implementation plan when it becomes the next phase. Phase 1 has that plan now. This keeps later implementation details grounded in what earlier work actually changes.

## Phase 1 - Reproducible Baseline

**Outcome:** A dependable starting point for the conversion.

- [x] Fix the Wuzzuf fixture test's dependence on the current date by controlling the test clock and parsing after that clock is set.
- [x] Assert the exact posting date for the fixture and verify relative-date behavior at another reference date.
- [x] Run the default test suite with live-source and database integration modes explicitly disabled.
- [x] Record passing type/build results, the known lint warning, and which integration checks still require an isolated database.

**Completed:** 2026-10-03. The focused parser/date checks passed all 20 tests. The full default suite passed 377 tests with zero failures and 64 skips; TypeScript passed. Production parser behavior is unchanged.

The parser should continue to interpret a live listing's age relative to the actual fetch time. The fix belongs in the fixture test rather than changing production date semantics to match an August snapshot.

**Files:** [Wuzzuf tests](C:/dev/einherji/src/lib/scrapers/aggregators/wuzzuf.test.ts), [parser](C:/dev/einherji/src/lib/scrapers/aggregators/wuzzuf.ts), [relative-date helper](C:/dev/einherji/src/lib/scrapers/parse-relative-date.ts).

**Detailed task plan:** [Phase 1 implementation plan](C:/dev/einherji/docs/superpowers/plans/2026-10-03-saas-phase-1-baseline.md).

## Phase 2 - Affordable Usage

**Outcome:** One account or a retry loop cannot turn the free product into uncontrolled provider spending.

- [x] Centralize exact, provider-specific server funding allowlists; compatible personal keys take priority and unapproved platform funding is rejected before provider requests.
- [ ] Select currently available models with acceptable pricing and data handling before enabling funded models. Allowlists are empty by default; deployment configuration has not been changed.
- [ ] Give pilot users small allowances. Initial proposed daily maxima: one CV parse, two fit reports, two generated documents, one scrape, and no funded hiring-manager searches.
- [ ] Add a configurable shared AI request ceiling and monthly funded-spend ceiling. Per-user maxima remain subject to shared availability and should not be presented as guaranteed provider capacity.
- [x] Make per-user/action quota admission atomic under concurrency while preserving rolling limits and history.
- [ ] Integrate shared budget reservations with atomic admission; individual quotas alone do not bound aggregate spending.
- [ ] Count provider attempts that may incur charges; bound prompt sizes, output tokens, retries, and batch sizes. Reserve a conservative cost before paid work and reconcile actual cost afterward.
- [ ] Keep paid fallback disabled for pilot accounts initially. Customer-provided keys remain optional and do not bypass platform workload controls.
- [ ] Require a verified account before platform-funded actions, while allowing access to saved data and profile editing.
- [ ] Show remaining allowances and clear exhausted-budget behavior in the active user surfaces.

Provider free capacity is shared and subject to rate limits, so it supplements these controls. It does not replace them. [OpenRouter limits](https://openrouter.ai/docs/api/reference/limits), [provider data practices](https://openrouter.ai/privacy).

**Existing boundaries:** [usage service](C:/dev/einherji/src/usage/usage.service.ts), [usage database](C:/dev/einherji/src/usage/usage.db.ts), [usage validators](C:/dev/einherji/src/usage/usage.validators.ts), [AI client resolution](C:/dev/einherji/src/lib/ai/resolve-ai-client.ts), [criteria validators](C:/dev/einherji/src/criteria/criteria.validators.ts), [schema](C:/dev/einherji/src/lib/db/schema.ts).

**Verification:** Unsupported models, unverified callers, empty budgets, last-unit concurrency, failed attempts, and retries must be exercised with mocked provider calls. Use an isolated database for concurrent admission tests.

**First slice completed 2026-10-03:** [AI funding policy and execution record](C:/dev/einherji/docs/AI-FUNDING-POLICY.md). All 20 resolver-policy tests pass; the full default suite passes 397 tests with 64 skips. Quota admission, shared budgets, account verification, and deployment model selection remain planned, so Phase 2 is not complete.

**Atomic user quotas verified 2026-10-10:** [Design](C:/dev/einherji/docs/superpowers/specs/2026-10-09-atomic-usage-quotas-design.md), [implementation plan](C:/dev/einherji/docs/superpowers/plans/2026-10-09-atomic-usage-quotas.md), and [execution/operating record](C:/dev/einherji/docs/ATOMIC-USAGE-QUOTAS.md). All 35 focused unit tests and seven live quota checks pass. The user explicitly approved fixture-only main-database verification and applying existing pending migration `0016`; fixtures were cleaned up. Shared budgets and the rest of Phase 2 remain planned.

## Phase 3 - Account And Document Lifecycle

**Outcome:** A pilot user can trust their account, profile, CV, and saved work.

- [ ] Implement controlled pilot registration without opening unrestricted sign-up. Reuse the existing registration and verification surfaces.
- [ ] Add account recovery using the installed Better Auth APIs, and verify email delivery is configured for the deployed environment rather than using the development logging fallback.
- [ ] Add an owned CV asset record with user ID, storage key, upload/processing state, and timestamps. Link extracted profile information to its source asset or version.
- [ ] Enforce private access and ownership on upload, parsing, download and deletion. Parsing should identify an owned asset rather than trusting an arbitrary submitted file URL.
- [ ] Provide export for profile, saved jobs, notes, application history, and generated documents.
- [ ] Implement account/asset deletion across database records and storage, with tracked retries for storage failures and documented backup retention.
- [ ] Rehearse additive migrations on a separate database and verify your existing account's relationships and credentials are preserved.

**Existing boundaries:** [authentication](C:/dev/einherji/src/lib/auth.ts), [signup policy](C:/dev/einherji/src/lib/signups.ts), [upload handler](C:/dev/einherji/src/lib/uploadthing.ts), [CV upload component](C:/dev/einherji/src/components/criteria/cv-upload.tsx), [criteria service](C:/dev/einherji/src/criteria/criteria.service.ts), [schema](C:/dev/einherji/src/lib/db/schema.ts).

**Verification:** Account A cannot access account B's asset or derived data. Deleted assets cannot be reparsed. Failed storage deletion can be retried. Export works while funded actions are paused. Test migration and recovery with disposable data.

## Phase 4 - Individual User Journey

**Outcome:** A new person can complete useful work through a clear, bilingual experience.

- [ ] Focus pilot navigation on profile, jobs, tracked companies, collections, application progress and settings. Advanced personal surfaces should have explicit availability rules rather than disappearing only from navigation.
- [ ] Add profile confirmation after CV extraction, with manual entry as a fallback. Keep stable matching fields and optional sections instead of building a schema editor.
- [ ] Add manual job creation from a pasted description with title, company, optional HTTP(S) application URL, and an owned collection. This path should not fetch the URL or call AI automatically.
- [ ] Represent manual provenance consistently in the job schema, validators, filters and source labels; preserve existing source values and deduplication behavior.
- [ ] Reuse fit reports, generated documents, status updates and notes. Present match percentage as requirement fit, and let users review application material.
- [ ] Add English/Arabic locale handling and RTL layout across the active journey, account emails and generated document language. Keep source text intact.
- [ ] Start new accounts with empty data or a user-selected generic job collection. The existing personal seed command remains explicit.
- [ ] Update customer-facing product copy to describe the supported workflow and source coverage.

**Existing boundaries:** [sidebar](C:/dev/einherji/src/components/layout/sidebar.tsx), [criteria form](C:/dev/einherji/src/components/criteria/criteria-form.tsx), [jobs router](C:/dev/einherji/src/jobs/jobs.router.ts), [jobs service](C:/dev/einherji/src/jobs/jobs.service.ts), [jobs validators](C:/dev/einherji/src/jobs/jobs.validators.ts), [source types](C:/dev/einherji/src/lib/scrapers/job-source.types.ts), [job documents](C:/dev/einherji/src/job-documents/job-documents.service.ts), [personal seed script](C:/dev/einherji/scripts/seed-buckets.ts).

**Verification:** Manual entry works with AI and scraping unavailable. Invalid links and cross-user collection IDs are rejected. Check the complete journey in English and Arabic on desktop and mobile, including mixed-language text, long labels, errors, and empty states.

## Phase 5 - Reliable Initial Discovery

**Outcome:** Discovery is useful without making the application depend on every existing adapter.

- [ ] Review two initial sources for permitted use, freshness, attribution, cost and actual geography. Existing Greenhouse and Lever adapters are candidates for tracked-company discovery, not a claim of comprehensive global search.
- [ ] Keep manual job entry usable when source coverage is insufficient or providers fail. Add an aggregator only if the selected cohort needs it and its use is reviewed.
- [ ] Move multi-source scraping and batch analysis into durable execution, reusing existing scrape-run records and QStash integration where suitable.
- [ ] Verify queue signatures, scope execution to the recorded user, claim work atomically, and make repeated deliveries safe. Define how interrupted or uncertain provider attempts are reconciled before retrying.
- [ ] Bound per-user concurrency, total source traffic and paid retries; preserve cancellation and visible progress.
- [ ] Reuse public listing data only where source rules permit it. Personal notes, CVs and fit reports remain user-owned.
- [ ] Add a small operating view or existing-tool queries for failed and stuck runs; avoid a separate administration platform.

**Existing boundaries:** [scraping service](C:/dev/einherji/src/scraping/scraping.service.ts), [scraping database](C:/dev/einherji/src/scraping/scraping.db.ts), [source registry](C:/dev/einherji/src/lib/scrapers/source-registry.ts), [QStash helper](C:/dev/einherji/src/lib/qstash.ts), [existing queue handler](C:/dev/einherji/src/app/api/queue/run-digest/route.ts).

**Verification:** Repeat a queue delivery, interrupt a run, cancel queued work, exhaust a budget mid-batch, fail one source, and attempt to execute another user's run. Provider effects must be bounded and saved results coherent.

## Phase 6 - Free Pilot

**Outcome:** Evidence that the product helps real people within your operating constraints.

- [ ] Recruit 10 people from the initial group through colleagues and relevant communities; observe a few first sessions.
- [ ] Limit pilot admission on the server and keep a registration pause mechanism.
- [ ] Run a four-week pilot. Aim for at least five people completing useful work more than once; treat this as a review target rather than a guaranteed outcome.
- [ ] Track saving a relevant first job, preparing a reviewed application, repeat use during an active search, reported time saved, provider cost and support time.
- [ ] Use one feedback/support channel and a suggested maximum of one hour of support per week within the five-hour project allocation.
- [ ] Explain beta limits, AI data processing, actual source coverage, retention, export and deletion in plain language.
- [ ] Review the results and choose whether to improve the same workflow, expand access, or revise the operating budget.

### Pilot Readiness Checks

- [ ] Default tests pass and production build succeeds.
- [ ] Isolation, budget concurrency, asset lifecycle and migration tests run against an isolated database; skipped tests do not satisfy this requirement.
- [ ] A fresh account completes the active journey in English and Arabic.
- [ ] Verification/recovery email delivery, storage privacy and deletion are tested in the deployment environment.
- [ ] Server-controlled admission and expensive-action pause behavior are tested.
- [ ] Spending alerts and provider limits supplement the application budget controls.
- [ ] The operator can identify failed work without exposing CV content in logs or analytics.

## Phase 7 - Capped Public Beta

**Outcome:** Expand only as far as measured cost and support capacity permit.

- [ ] Begin with a recommended ceiling of 50 admitted accounts; keep the ceiling configurable and increase it only from measured active-user workload.
- [ ] Keep reading saved data and export available when funded actions are exhausted or paused.
- [ ] Review source coverage, model availability, cost and support load regularly.
- [ ] Use pilot costs to decide whether expensive features need paid credits, optional customer keys, or a larger funded allowance. Configure payment only after choosing that model.
- [ ] Start a separate design for the next validated customer mode. Shared workspaces become relevant when shared ownership and permissions are needed.

## Current Baseline - Checked 2026-10-10

| Check | Result | Meaning |
| --- | --- | --- |
| TypeScript | Passed with `tsc --noEmit`, rerun after atomic quota changes. | Changed code and current project type-check. |
| Focused date tests | 20 passed across two files. | Fixed-clock fixture and later reference dates preserve relative posting-date behavior. |
| Funding-policy tests | 20 passed in the shared client resolver suite. | Personal-key priority and exact provider-specific allowlists verified without provider requests. |
| Atomic quota unit tests | 35 passed across admission, service, and target-guard suites. | Confirms failure handling and target safety without provider calls. |
| Live quota tests | Seven passed separately; fixture cleanup confirmed. | Includes concurrent final-unit and observed lock-wait verification. |
| Lint | Rerun after atomic quota changes: zero errors, one React Hook Form/React Compiler warning. | Existing warning remains documented. |
| Default tests | 432 passed, zero failed, 66 skipped; 42 files passed, 10 skipped. | Other skipped coverage remains unverified. |
| Production build | Rerun after atomic quota changes: passed on Next.js 16.2.6. | Sentry `disableLogger` deprecation warnings remain. |
| Dependency audit | 44 reported vulnerable packages, two critical-rated (`next`, `proxy-addr`). | Requires a separate security-remediation pass before public launch. |
| Database/live-source modes | Explicitly disabled for the default test run. | No claim that the skipped integration coverage passed. |

Current warnings should be assessed when their owning files are changed; the Sentry configuration warning should be resolved before a dependency upgrade makes it incompatible.

## Phase 1 Constraints

- Existing user-owned data and identifiers must be preserved.
- Database migrations and source/provider calls are outside Phase 1 execution.
- User ownership remains the tenant model.
- Registration remains closed during Phase 1.
- Default verification explicitly disables database and live-source test modes.
- The Wuzzuf fix controls test time without changing production posting-date semantics.
- Use the installed Next.js documentation before changing Next.js APIs or configuration.

## Next Session

Prioritize the newly observed dependency security advisories before public exposure, then design shared request/spend ceilings and funding eligibility before consuming an allowance. Atomic per-user quotas are verified, but they are not an aggregate monetary budget. Preserve existing data and closed registration; the remaining Phase 2 and pilot-readiness controls still apply.
