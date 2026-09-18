# Einherji SaaS Conversion Findings

**Date:** 2026-09-18  
**Repository:** `C:\dev\einherji`  
**Purpose:** Record the current-state findings before creating an implementation plan.

## Executive Summary

Einherji is already a substantial personal-use application. It has a domain-oriented server architecture, authenticated users, database migrations, tenant-isolation tests, encrypted credentials, usage quotas, multiple scraping adapters, AI workflows, and daily digest infrastructure.

The main SaaS problem is that the current tenant is a **user**, while a SaaS product normally needs an **account or workspace** that can own data, subscriptions, usage, integrations, and possibly multiple members.

The project also combines two product directions:

- A personal job-search assistant.
- A lead-generation and outreach workspace for agencies or service providers.

The existing `buckets` model acknowledges both directions, but surrounding language and several workflows still assume the primary user is an individual job seeker.

### Overall assessment

| Area | Assessment |
|---|---|
| Core code quality | Strong for a personal product |
| Type safety | Good; TypeScript passes |
| Build health | Production build passes |
| Test health | Broad suite, with one current failing test |
| Authentication | Present and protected tRPC boundary exists |
| Data isolation | User-scoped and covered by integration tests |
| SaaS tenancy | Not yet modeled as workspaces/accounts |
| Billing | Not implemented |
| Usage economics | Hard-coded quotas; platform cost exposure remains |
| Background execution | Partially implemented; scraping and AI backlogs remain request-bound |
| Personal seed/defaults | Clearly present in the starter bucket script |
| Commercial readiness | Not ready for unrestricted public launch |

## 1. Current Architecture

### Application stack

- Next.js `16.2.6` App Router.
- React `19.2.4`.
- TypeScript with strict compilation passing.
- tRPC `11.x` for application APIs.
- Better Auth for email/password authentication and sessions.
- Neon PostgreSQL with Drizzle ORM.
- OpenRouter as the server-side AI fallback, with optional direct OpenAI credentials.
- UploadThing for CV uploads.
- Multiple scraper tiers: public ATS boards, aggregators, LinkedIn guest pages, Apify fallback, and Google Places.
- Vercel Cron for daily digest scheduling.
- Optional Upstash QStash for per-account digest fan-out.
- Sentry integration configured in the application infrastructure.

### Server organization

Most domains follow this structure:

```text
validators -> db -> service -> router -> client hooks/components
```

This pattern exists across jobs, scraping, criteria, leads, messages, buckets, settings, credentials, job insights, job documents, saved views, mute rules, companies, places, and usage.

The central router is [`src/server/root.ts`](../src/server/root.ts), and application routers use `protectedProcedure` from [`src/server/trpc.ts`](../src/server/trpc.ts).

### Main product surfaces

- `/dashboard`: activity and account overview.
- `/criteria`: job-search profile, CV, skills, and model selection.
- `/jobs`: scraped jobs, filtering, ranking, triage, status updates, notes, and details.
- `/companies`: tracked companies and ATS detection.
- `/leads`: contacts and business leads.
- `/messages`: generated-message approval workflow.
- `/tracker`: lead pipeline board.
- `/settings`: integrations, sources, AI keys, digest, and account configuration.

### Database model

The database contains Better Auth tables plus application tables for criteria, jobs, job events, fit reports, generated documents, leads, messages, buckets, saved views, mute rules, tracked companies, user settings, source credentials, scrape runs, and usage events.

The schema is concentrated in [`src/lib/db/schema.ts`](../src/lib/db/schema.ts). Important table locations include:

- `users`: line 8.
- `criteria`: line 228.
- `jobs`: line 257.
- `jobEvents`: line 377.
- `jobFitReports`: line 402.
- `jobDocuments`: line 433.
- `leads`: line 508.
- `userSettings`: line 565.
- `buckets`: line 621.
- `trackedCompanies`: line 650.
- `sourceCredentials`: line 675.
- `scrapeRuns`: line 693.
- `usageEvents`: line 735.
- `messages`: line 749.

The schema has foreign keys and indexes for the current user-scoped model. This is a good base for a migration, but most application tables will eventually need `workspaceId` or an equivalent account owner.

## 2. What Is Already Strong

### 2.1 Consistent authenticated API boundary

Application tRPC routers use `protectedProcedure`, which checks for an active Better Auth session before reaching domain logic. Middleware handles presentation redirects while the tRPC layer remains the data-security boundary.

Relevant files:

- [`src/server/trpc.ts`](../src/server/trpc.ts)
- [`middleware.ts`](../middleware.ts)
- [`src/lib/auth.ts`](../src/lib/auth.ts)

### 2.2 User-level isolation is implemented and tested

The current system passes `ctx.session.user.id` into domain services and database functions. Database queries generally include `userId` in their filters. Dedicated integration tests cover tenant isolation and referential integrity.

This should be preserved during the SaaS migration rather than replaced with an unrelated architecture.

### 2.3 Secret handling is materially better than a typical side project

Third-party credentials are encrypted with AES-256-GCM in [`src/lib/crypto/secret-box.ts`](../src/lib/crypto/secret-box.ts). The settings API returns masked previews and presence flags instead of raw secrets.

Credential categories include Apify, scraping proxies, Telegram, OpenRouter, OpenAI, Adzuna, SerpAPI, Reddit, and X/Twitter credentials.

### 2.4 Scraping infrastructure has real boundaries

The scraper system has a source registry, normalized `ScrapedJob` contract, runtime Zod validation, retries, rate limiting, source adapters, job deduplication, persisted scrape runs, cancellation, stale-run handling, and attribution support.

This is a strong foundation for a commercial source strategy, particularly for public ATS APIs and licensed or customer-supplied sources.

### 2.5 Job workflow is no longer just a scraper

Jobs support relevance scoring, statuses, status events, notes, dismissal reasons, saved views, mute rules, freshness tracking, cross-source deduplication, AI fact extraction, fit reports, and generated application documents.

That gives the product a real workflow engine that could be repurposed for opportunities or client signals if that becomes the primary direction.

### 2.6 Usage protection exists, but it is not billing

The `usage_events` table and `consumeQuota` service provide rolling 24-hour per-user limits for scraping, message generation, CV parsing, manager searches, job analysis, fit reports, and document generation.

Relevant files:

- [`src/usage/usage.validators.ts`](../src/usage/usage.validators.ts:25)
- [`src/usage/usage.service.ts`](../src/usage/usage.service.ts:26)
- [`src/usage/usage.db.ts`](../src/usage/usage.db.ts)

This is a useful safety mechanism, but it is a cost ceiling, not a subscription entitlement system.

## 3. Personal-Use Assumptions

### 3.1 Personal starter buckets

There is no ordinary global production seed that inserts a specific personal user or personal rows. However, [`scripts/seed-buckets.ts`](../scripts/seed-buckets.ts) contains clearly personal starter data in `STARTER_BUCKETS` at line 20.

The script creates:

- `Jobs for me`.
- `Clients for us`.
- `Paper factory — Cairo & Giza`.
- `Clothing suppliers`.

It contains Cairo, Giza, Egypt, and Arabic location terms, personal software-development pitches, paper-roll sourcing language, clothing supplier language, and comments referring to a family paper business.

This should not run automatically for every SaaS account. It should become an explicit local/demo seed or an optional onboarding template.

### 3.2 Personal terminology in the product model

The current application contains both personal job-search terminology and agency/client-acquisition terminology:

- `criteria` is primarily shaped around a personal CV and job titles.
- `buckets.kind` supports `jobs`, `clients`, `suppliers`, and `custom`.
- Leads can represent hiring managers, business contacts, or suppliers.
- Messages support job-seeker, service-provider, and buyer personas.
- Google Places is used for finding businesses rather than job listings.

The data model is flexible enough to support several modes, but the SaaS product needs a clear primary customer and vocabulary.

### 3.3 Signups are currently closed

[`src/lib/signups.ts`](../src/lib/signups.ts:17) sets `ARE_SIGNUPS_OPEN = false`. Better Auth also disables signup server-side through `disableSignUp` in [`src/lib/auth.ts`](../src/lib/auth.ts).

This is appropriate while the product is private, but public SaaS onboarding will require an explicit account creation and onboarding flow rather than simply flipping the boolean.

### 3.4 Personal docs are mixed with current implementation docs

Some documentation is explicitly marked as outdated. [`docs/README.md`](./README.md) and the `docs/docs/` directory describe an earlier architecture involving Next.js 14, Clerk/NextAuth, REST routes, and direct Claude API usage.

The current code uses Next.js 16, Better Auth, tRPC, and OpenRouter. The stale docs should be archived or rewritten before external contributors, customers, or future agents use the repository.

## 4. SaaS Conversion Findings

### Critical: User ownership is not workspace tenancy

Every business row is currently owned by `userId`. That works for isolated personal accounts but does not support teams, agencies with multiple operators, invitations, owner transfer, roles, shared integrations, shared usage, shared billing, or workspace-level export and deletion.

The likely target model is:

```text
user
workspace
workspace_member
workspace_subscription
workspace_integrations
workspace_usage
```

Business data should be owned by `workspaceId`. Tables that need authorship can additionally retain `createdByUserId`.

The migration must preserve existing personal users by creating one workspace per existing user and assigning all existing rows to it.

### Critical: No billing or entitlement system

There are no subscription, plan, invoice, payment-provider, entitlement, or billing-event tables. There is also no billing provider dependency in `package.json`.

The current hard-coded quotas in [`src/usage/usage.validators.ts`](../src/usage/usage.validators.ts:25) cannot express free versus paid plans, monthly allowances, workspace limits, overages, trials, payment grace periods, upgrades, downgrades, admin overrides, or customer-visible usage history.

### Critical: Platform-funded AI usage remains possible

The AI client falls back to `env.OPENAI_API_KEY` or `env.OPENROUTER_API_KEY` when the account does not provide credentials. This behavior is implemented in [`src/lib/ai/resolve-ai-client.ts`](../src/lib/ai/resolve-ai-client.ts:68).

That is convenient for a personal installation, but in SaaS it means a new customer can consume platform-funded AI spend unless an entitlement policy explicitly limits or disables it.

The commercial product needs a clear model:

1. Platform-funded AI included within plan quotas.
2. Customer-supplied AI keys.
3. Metered usage with overage billing.
4. A hybrid model with strict platform caps and optional customer keys.

### High: Scraping and AI work are still request-bound

The main scrape flow is `startScrape` in [`src/scraping/scraping.service.ts`](../src/scraping/scraping.service.ts:99). It loops through sources and persists results inside the request lifecycle.

The job analysis backlog is also sequential and request-bound in [`src/job-insights/job-insights.service.ts`](../src/job-insights/job-insights.service.ts:99).

The daily digest has optional QStash fan-out, but that does not yet turn every scrape, analysis batch, or document generation request into a durable background job. SaaS operation needs durable job records, retries, idempotency, per-workspace concurrency, cancellation, progress, dead-letter handling, and admin visibility into stuck jobs.

### High: Shared scraper infrastructure can couple customers

Public source rate limits, host circuit breakers, and server egress behavior can affect multiple customers. A single heavy tenant can cause a source or IP to become blocked for everyone.

The commercial version should distinguish global host safety limits, workspace-level quotas, customer-supplied credentials, commercially allowed sources, and experimental or personal-only sources.

LinkedIn guest scraping and Apify-based manager discovery are especially risky as paid features because commercial usage changes the legal, terms-of-service, and abuse profile compared with personal use.

### High: CV files are not modeled as owned assets

The upload route authenticates the user, but the returned CV URL is sent directly to extraction and is not persisted. The implementation returns `file.url` from [`src/lib/uploadthing.ts`](../src/lib/uploadthing.ts:15), and the client passes the URL into the extraction mutation in [`src/components/criteria/cv-upload.tsx`](../src/components/criteria/cv-upload.tsx:76).

Implications:

- The active CV file cannot be displayed or deleted as an account asset.
- Retention and deletion policy cannot be enforced from the database.
- The file URL may remain publicly accessible according to the storage provider behavior.
- The implementation uses a field identified by the audit as deprecated for the installed UploadThing version.

A SaaS version needs a first-class CV/document asset with owner, storage key, status, created time, retention policy, and deletion path. Extracted text should be associated with the asset or a version record.

### High: Product positioning is split between two workflows

The feature set supports two distinct customer outcomes:

#### Job seeker

```text
criteria -> scrape jobs -> rank -> shortlist -> apply -> generate documents -> track outcome
```

#### Agency/service provider

```text
signals or business search -> leads/opportunities -> generate outreach -> approve -> follow up -> track outcome
```

The first workflow has stronger implementation depth. The second may have stronger SaaS economics, but it needs different entities, messaging, metrics, and onboarding.

Trying to launch both as equal products will increase complexity in terminology, navigation, onboarding, pricing, metrics, AI prompts, data relationships, and customer support.

### Medium: Usage events are not sufficient for cost accounting

The current `usage_events` table records the action and user, but not workspace, plan, provider, model, input/output tokens, provider cost, external run ID, idempotency key, or success/failure state.

For SaaS economics, the system needs to distinguish product usage from provider cost. A completion or scrape can have materially different costs depending on model, prompt size, source, provider, and result volume.

### Medium: Account deletion and data lifecycle need a SaaS policy

The existing schema uses cascading foreign keys in many places, which is a good foundation for deletion. A SaaS product still needs explicit behavior for account deletion, workspace deletion, member removal, export before deletion, CV and credential removal, billing-record retention, audit-log retention, and third-party data deletion.

### Medium: Onboarding is currently configuration-first

The application expects users to understand criteria, sources, credentials, buckets, and model choices. Commercial onboarding should guide the customer to a first successful outcome with minimal configuration.

Examples:

- Job seeker: import CV, choose role and location, receive first ranked jobs.
- Agency: define service offer, choose target market, create first qualified opportunity, generate first approved message.

### Medium: Public operational readiness is incomplete

The repository has Sentry hooks and cron/QStash guards, but a launch checklist still needs alert thresholds, provider failure monitoring, queue lag monitoring, scraper health dashboards, backup/restore verification, migration rollback strategy, abuse controls, request rate limiting, admin support tools, privacy/terms pages, and customer-visible incident behavior.

## 5. Security and Correctness Notes

### Confirmed healthy areas

- Protected tRPC procedures are used for application operations.
- Tenant-isolation integration tests exist.
- Foreign-key cascade behavior is tested.
- SSRF protections exist around user-provided CV URLs and scraper requests.
- Third-party secrets are encrypted at rest.
- Cron and QStash routes fail closed when signing configuration is missing.
- Production TypeScript compilation succeeds.

### Current test failure

The normal test command currently reports:

```text
Test Files: 1 failed, 37 passed, 10 skipped
Tests:      1 failed, 374 passed, 64 skipped
```

The failing test is:

```text
src/lib/scrapers/aggregators/wuzzuf.test.ts
parseWuzzufJobPage > prefers the posted age in the header over the sitemap lastmod
```

The assertion compares a parsed relative date against a hard-coded fixture date from August 22, 2026. On September 18, 2026, the real clock makes the assertion invalid. This is a test determinism problem, not evidence that the parser is currently broken. The test should inject or freeze the reference time.

### Current lint/type/build status

- `npx tsc --noEmit`: passes with no errors.
- `npm run build`: passes.
- `npm run lint`: no errors, one warning from React Hook Form `form.watch()` usage in `src/components/criteria/criteria-form.tsx`.
- `npm test`: one failing time-dependent test described above.

## 6. Recommended SaaS Direction

The current code supports two viable directions.

### Option A: Job-seeker SaaS

Core promise:

> Find, rank, understand, and apply to the best jobs with less manual work.

Strengths:

- Existing job workflow is deeper.
- CV and document generation already exist.
- Daily digest is directly useful.
- Onboarding can be simple and self-serve.

Risks:

- Success causes churn when the user gets hired.
- Price sensitivity is likely high.
- Scraping and source legality still need careful handling.

### Option B: Agency/service-provider SaaS

Core promise:

> Turn hiring and business activity into qualified opportunities and approved outreach.

Strengths:

- Existing buckets, leads, messaging personas, Places, and business pitches support it.
- Customer value can be tied to revenue rather than job applications.
- Successful customers have a reason to continue using the product.

Risks:

- The opportunity entity is not yet modeled cleanly.
- Contact discovery and data compliance become more important.
- The current UI and terminology are still job-search oriented.

### Recommended direction

Use **agencies/service providers as the primary commercial target**, while retaining job-seeker functionality as a secondary mode or free tier only if it does not distort the main architecture.

This recommendation is strategic, not an implementation decision. Workspace, billing, and queue foundations should remain neutral enough to support either mode, but the first commercial onboarding and pricing should target one customer outcome.

## 7. Findings-Based Priority Order

This is a priority order for the future implementation plan, not the implementation plan itself.

1. Decide the primary paid customer and product promise.
2. Define account/workspace terminology and migration rules.
3. Introduce workspace ownership and membership without breaking current user data.
4. Define plans, entitlements, quotas, provider-cost accounting, and payment behavior.
5. Remove personal starter data from default SaaS onboarding.
6. Convert expensive scraping and AI actions to durable background jobs.
7. Define which data sources are commercially allowed and which are personal-only.
8. Model CVs and other uploaded assets with ownership and lifecycle controls.
9. Rewrite stale documentation and create current SaaS operating documentation.
10. Add customer onboarding, activation metrics, admin support tooling, and launch controls.

## 8. Files Consulted

Primary implementation files:

- [`src/lib/db/schema.ts`](../src/lib/db/schema.ts)
- [`src/server/trpc.ts`](../src/server/trpc.ts)
- [`src/server/root.ts`](../src/server/root.ts)
- [`src/lib/auth.ts`](../src/lib/auth.ts)
- [`middleware.ts`](../middleware.ts)
- [`src/usage/usage.validators.ts`](../src/usage/usage.validators.ts)
- [`src/usage/usage.service.ts`](../src/usage/usage.service.ts)
- [`src/scraping/scraping.service.ts`](../src/scraping/scraping.service.ts)
- [`src/digest/digest.service.ts`](../src/digest/digest.service.ts)
- [`src/job-insights/job-insights.service.ts`](../src/job-insights/job-insights.service.ts)
- [`src/lib/ai/resolve-ai-client.ts`](../src/lib/ai/resolve-ai-client.ts)
- [`src/lib/crypto/secret-box.ts`](../src/lib/crypto/secret-box.ts)
- [`src/lib/uploadthing.ts`](../src/lib/uploadthing.ts)
- [`src/components/criteria/cv-upload.tsx`](../src/components/criteria/cv-upload.tsx)
- [`scripts/seed-buckets.ts`](../scripts/seed-buckets.ts)
- [`src/lib/signups.ts`](../src/lib/signups.ts)
- [`src/lib/env.ts`](../src/lib/env.ts)

Relevant tests and documentation:

- `src/server/tenant-isolation.integration.test.ts`
- `src/server/referential-integrity.integration.test.ts`
- `src/credentials/credentials.integration.test.ts`
- `src/app/api/cron/daily-digest/route.test.ts`
- `src/app/api/queue/run-digest/route.test.ts`
- `src/lib/scrapers/aggregators/wuzzuf.test.ts`
- `docs/AUDIT.md`
- `docs/PRODUCT-DIRECTION.md`
- `docs/ENHANCEMENT-PLAN.md`
- `docs/NEXT-STEPS.md`
- `docs/SCRAPER-PLAN.md`
- `docs/README.md`

## Conclusion

Einherji has a credible technical base for SaaS, but it should not be opened broadly by only enabling registration. The important work is structural:

- Move ownership from users to workspaces.
- Make billing and provider cost explicit.
- Make expensive work durable and queue-backed.
- Separate personal defaults from product onboarding.
- Choose one primary commercial workflow.

The next artifact should be a product and architecture design document for the chosen SaaS direction. After that, the implementation plan can be decomposed into independently testable phases.
