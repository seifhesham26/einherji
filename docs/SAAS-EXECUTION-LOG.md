# SaaS Execution Log

## 2026-10-10 - Dependency Security

Authorization: continue the approved phased roadmap, verify each slice, commit,
merge and push to main. Preserve the primary checkout's questionnaire edits.

Plan:
1. Audit the locked dependency tree and inspect affected dependency paths.
2. Upgrade Next.js and its ESLint config together; use compatible dependency
   updates first, without force-downgrading upload, scraper or migration APIs.
3. Review unresolved advisories and apply narrowly scoped compatible fixes.
4. Run default tests (integration/canary off), TypeScript, lint and build.
5. Review the diff, commit, merge and push; continue Phase 2.

Baseline: npm audit reports 44 affected packages: two critical, 30 high,
10 moderate and two low. Critical paths are Next.js and proxy-addr (through
the shadcn CLI's MCP/Express dependencies). The application imports shadcn's
CSS, so removing the package outright would break styling.

Ruling: use the audit as the dependency regression check, not a simulated
exploit of a public server. No new application behavior is introduced in this
slice. Keep cache-component adoption, provider settings, registration, and
database changes outside this dependency remediation.

Sources reviewed: https://nextjs.org/blog/next-16-4 and
https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h.

Later phases include external verification, source-use review, real pilot
recruitment and four weeks of observation. These cannot be marked completed
by code changes or mocked tests; record the remaining operator steps honestly.

Result: Next.js and eslint-config-next 16.4.0, compatible lockfile updates,
and an Effect 3.20.1 override. The override stays within the installed
@effect/platform peer's 3.x range and addresses
https://github.com/Effect-TS/effect/security/advisories/GHSA-38f7-945m-qr2g.
UploadThing's real route handler passes two offline smoke checks: existing PDF
configuration and authentication rejection before any outbound upload request.

Remaining audit roots:
- braces <=3.0.3: upstream has no patched stable release at this check; build
  and CLI globbing dependencies inherit the advisory. Never feed untrusted glob
  patterns into these tools. https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- basic-ftp 5.3.1 through get-uri/PAC proxy support in apify-client: a patched
  6.x release exists, but overriding across the declared major is not a verified
  compatibility fix. Application code does not invoke FTP directory listing;
  do not accept user-controlled PAC proxy configuration. Review the parent
  upgrade before enabling public scraping.
- esbuild 0.18.20 through drizzle-kit's old loader: migration tooling, not an
  application dev server. Do not expose its server to untrusted networks.

Audit after remediation: 18 affected packages, 14 high, four moderate, zero
critical/low. Production-omit audit reports 16 because npm includes shared CLI
and optional-peer dependency paths; this is not proof they are all reachable in
the deployed bundle. Public readiness remains blocked on residual review.

Ruling: do not use npm audit fix --force or force-downgrade Next/UploadThing/
Drizzle/shadcn APIs to make the count zero. It can remove needed CSS and change
upload/migration behavior. Cost: the residual advisories remain tracked.

Review: author self-review (no native reviewer tool available); checked manifest,
lockfile dependency paths, matching Next versions, environment-file exclusion,
upload middleware compatibility and existing tests. No application/database
behavior changed. No deployed upload or production traffic tested.

Verification: 432 existing tests passed, 66 skipped; two additional upload
smoke tests passed. TypeScript and Next 16.4 production build passed. Lint had
zero errors and the existing React Hook Form warning. Sentry's existing
disableLogger deprecation remains.

## 2026-10-10 - Bounded AI Attempts

Purpose: one intentional user action must not silently become multiple billed
attempts. All five text-completion paths use a shared request guard: at most
64,000 UTF-8 prompt bytes (system and user text combined), 1,600 output tokens,
one completion choice, no streaming/non-text payloads, and model IDs up to 200
characters. Existing per-feature output caps remain lower where appropriate.

Both personal and funded SDK clients disable automatic retries and use a
30-second timeout. Request options repeat these bounds so a future caller's
client settings cannot silently restore retries. No paid fallback was added.
Timeouts/unknown outcomes are not refunded or retried automatically: the
provider may have billed an attempt even if the response was lost.

TDD evidence: five resolver checks initially failed (SDK default retries were
two, and a mocked 500 caused three real SDK fetch attempts). Twelve request
guard checks failed against the forwarding-only implementation; two more
checks caught multiple choices/alternate output limits. They pass after the
guard and retry changes. All provider responses in tests are mocked.

Ruling: a hard total byte guard rejects oversized inputs instead of silently
truncating additional user fields; existing CV/description excerpts stay intact.
Cost: very large profiles or application questions need shortening. Thirty
seconds may reject slow models; users can retry deliberately, consuming a new
allowance. Limits are workload controls, not a monetary accounting guarantee.

Still pending: shared request and conservative monetary reservations, verified
funded accounts, funding eligibility before allowance consumption, smaller
pilot quotas, durable batch execution and deployment model selection. Existing
per-user limits are unchanged. This slice does not complete Phase 2.

Verification: 457 default tests passed, 66 skipped; TypeScript, lint (one
existing warning) and production build passed. Review: author self-review of
all five call sites and guard bypasses, including alternate output limits,
multiple choices, UTF-8 sizing and unknown provider failures. No live AI calls.

## 2026-10-10 - Funding Eligibility Before User Allowances

All AI service paths now use one admission helper after owned-record and
required-context checks. It resolves the same compatible-key selection as the
SDK resolver, rejects unavailable platform models first, reads email verification
from the database for platform funding, then consumes the atomic user quota.
Personal keys still consume workload allowances. Saved fit reports need no new
funding admission. A failed account read fails closed before quota/provider work.

TDD: seven helper checks failed against quota-only admission; message checks
reproduced allowances consumed for missing leads and missing pitches; five
service checks exposed missing admission in CV, facts (single/batch), fit and
document calls. The suite now passes 477 tests with 66 skips. TypeScript and
lint pass (one existing warning). No migration or live provider call required.

Ruling: verification is read server-side from the account record, not trusted
from client input or a potentially stale session. Cost: an extra database read
for a funded request. A concurrent account-state change after this read remains
possible; admission is not an account-revocation transaction. Shared spending
controls are still required before deployment funding is enabled.

## 2026-10-10 - Zero Paid AI And Shared Capacity

Operator decision: $0 monthly platform AI spending. Only explicitly reviewed,
exact allowlisted OpenRouter `:free` variants can use the platform key; paid
OpenRouter and direct OpenAI platform requests fail even when allowlisted.
Personal keys retain compatible routing and workload controls.

Shared AI request capacity defaults to 50 attempts per rolling 24 hours,
configurable with AI_SHARED_DAILY_REQUEST_LIMIT (0 pauses new AI). Admission
takes a global advisory lock before the existing user/action lock, then counts
all five AI action types across all accounts in a separate fresh-snapshot SQL
statement. Shared and user limits govern the same usage-event insertion.
Personal attempts count too. Denial inserts nothing; unknown database outcomes
fail closed. No new database migration or funded provider request was needed.

TDD: six shared admission checks initially failed; three zero-paid policy checks
reproduced paid platform authorization before the fix. Nine live fixture-only
checks passed, including shared final-slot competition across users/actions and
the seven previous quota cases. Fixture cleanup asserts zero known fixture users.

Ruling: under a $0 policy, disallow paid platform inference instead of introducing
a paid-spend ledger with speculative prices. Cost: no server-paid models can be
enabled without a separately reviewed monetary reservation implementation.
Ruling: use one conservative shared limit for both platform and personal requests,
not a guaranteed per-user allowance. Cost: personal-key users can exhaust shared
capacity; user-facing availability must make that visible.

Constraints: all production AI services must call the shared admission helper;
drain old deployments that write only per-user quotas before activating funding.
Global scans are acceptable for the closed small pilot; add a created_at index
when retained usage volume warrants it. Existing account cascades delete usage
history, so the later deletion flow must retain anonymous shared-capacity accounting
through the active window before opening deletion/admission to the public.

Availability check used the public model catalog, no credentials or user text.
Both old Llama :free IDs are absent. Google Gemma 4 31B :free is a current zero-
priced catalog candidate, served by Google AI Studio; its presence is not approval
for CV data processing. No deployment key, allowlist, or stored model was changed.
References: https://openrouter.ai/docs/guides/routing/model-variants/free and
https://openrouter.ai/docs/api/reference/limits.

Verification: 488 default tests passed, 68 skipped; nine live quota tests passed
separately. TypeScript, lint (one existing warning), and Next 16.4 production
build passed. Review: author self-review of lock ordering, fresh snapshots,
bound parameters, shared denial metadata, zero capacity, malformed results and
all current AI service callers. The public pilot remains unopened.

## 2026-10-10 - Pilot Allowances And Visibility

SAAS_PILOT_MODE=1 selects one CV parse, two fit reports, two documents, one
scrape, zero hiring-manager searches, five analyses and two messages per rolling
24 hours. Unset/0 preserves personal-install quotas. Ambiguous mode values
fail closed; no deployment environment setting was changed. Admission and
status read the same policy.

Settings shows individual remaining allowances, shared AI capacity, the $0
platform spending policy, loading/error and paused states, plus refresh. The
shared read endpoint is authenticated and exposes only aggregate counts, not
account identities or content. Its status is advisory; admission is authoritative.
The AI-key copy no longer promises an unconditional server-funded fallback.

Browser verification used an isolated headless Edge profile with fake UI session
data and intercepted every API request. No actual account/provider API calls.
Desktop 1280x900 and mobile 390x844 both showed seven rows without horizontal
overflow; refresh made new fixture queries, and paused state remained clear.
Screenshots inspected. Offline render tests cover error/loading/allowance states.
Ten live fixture-only quota checks passed, including pilot final-slot admission,
disabled manager searches and matching displayed limits; fixtures were cleaned.

Ruling: the copied environment referenced the deployed host, so local dev uses
process-only localhost URL overrides; no environment files were edited. Browser
requests to that host were blocked. The check also exposed an existing trailing-
slash API URL bug. Two regression cases failed before replacing concatenation
with the native URL constructor; three URL cases now pass. Cost: URL root paths
remain the existing contract (the app has no configured Next basePath).

Ruling: keep personal installation limits unless the operator explicitly enables
pilot mode. Cost: readiness requires enabling it in the pilot deployment, not
assuming code defaults have reduced all existing accounts' limits.

Verification: 504 default tests passed, 69 skipped; TypeScript, lint (one
existing warning) and production build passed. Ten live quota tests passed
separately. Author self-review checked shared/per-user status consistency,
authenticated aggregate reads, inaccessible/error/loading states, secret-free
client configuration, and the unchanged personal/default deployment settings.
