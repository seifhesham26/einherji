# Upcoming SaaS Tasks

Updated: 2026-10-10. Mail sender setup and live email testing are deferred at
your request. This is the resume checklist, not a public-launch approval.

## Confirmed Decisions

- Platform AI spending: $0/month. Paid inference requires a compatible personal key.
- Individual accounts remain the ownership boundary; teams/payments come later.
- Registration remains closed until controlled pilot admission is implemented.
- Pilot quotas are implemented behind `SAAS_PILOT_MODE=1`; deployment settings
  are unchanged and personal-install defaults are preserved.
- Continue in verified slices: test, review, commit, merge and push.
- Never put keys, database connections, recovery tokens or CV content in Git.

## Completed Code

- [x] Next.js/config 16.4.0 and compatible dependency fixes. Audit reduced from
  44 to 18 affected packages; zero critical findings, residual high/moderate findings.
- [x] Atomic user/action quotas and shared AI capacity across accounts/actions.
- [x] Zero paid platform inference, even when a paid model is mistakenly allowlisted.
- [x] Verified platform-funded accounts and funding eligibility before user allowances.
- [x] No SDK retries; 30-second attempts, 64,000 UTF-8 prompt bytes, one completion
  and 1,600 output tokens maximum, retaining smaller feature-specific limits.
- [x] Pilot quotas: one CV parse, two fit reports, two documents, one scrape,
  five analyses, two messages and no hiring-manager searches per rolling 24 hours.
- [x] Visible personal/shared allowances, paused/error/loading states and refresh.
- [x] Trailing-slash-safe tRPC endpoint configuration.
- [x] Recovery request/reset screens and Better Auth configuration, offline verified.
  Production fails closed when mail configuration is missing; no live delivery verified.

Latest checks: 522 default tests passed, 69 skipped; ten live quota checks passed
separately with owned fixtures cleaned up. Recovery tests use real Better Auth
with an in-memory adapter and mocked mail, not the deployed database. Browser
checks use API fixtures at desktop/mobile sizes, not real accounts/provider calls.

Details: [Execution log](C:/dev/einherji/docs/SAAS-EXECUTION-LOG.md),
[roadmap](C:/dev/einherji/docs/SAAS-PHASED-PLAN.md),
[funding policy](C:/dev/einherji/docs/AI-FUNDING-POLICY.md).

## Next Coding Tasks

### NEXT-01 - Owned, Private CV Assets

- [ ] Store owner ID, storage key, processing state and timestamps for each upload.
- [ ] Enforce private storage and ownership on upload, read, parse and deletion.
- [ ] Replace arbitrary client-submitted CV URLs with an owned asset ID.
- [ ] Link extracted profile data to its source asset/version.
- [ ] Bound streamed downloads and validate redirects before allowance/provider work.
- [ ] Test cross-account access, deleted assets and failed processing/retries.

Done when account A cannot read, parse or delete account B's CV. Review additive
migration and existing-upload handling; do not silently authorize arbitrary old URLs.

### NEXT-02 - Export And Deletion

- [ ] Export owned profile, jobs, notes, application history and generated documents.
- [ ] Exclude API keys, password hashes, session tokens and internal credentials.
- [ ] Implement account/asset deletion with tracked storage retries and backup policy.
- [ ] Preserve anonymous shared-capacity accounting through the active window.
  Current account cascades delete usage events; deletion must not refill global capacity.
- [ ] Verify other accounts remain untouched and export works while AI is paused.

Done when failed storage cleanup can be retried safely. Do not promise immediate
deletion from all backups or open deletion without preserving workload accounting.

### NEXT-03 - Controlled Pilot Admission

- [ ] Add server-enforced invitations/admission, initially ten accounts, with a cap
  and registration pause switch.
- [ ] Test concurrent last-slot admission and expired/reused invitations.
- [ ] Start accounts empty or offer a user-selected generic job collection.
- [ ] Keep personal seeding explicit; never run it for new SaaS accounts.

Hiding the register page or checking an unlocked account count is insufficient.

### NEXT-04 - Review Free Models

- [ ] Replace obsolete free-model choices after availability and quality review.
  Both existing Llama free IDs were absent from OpenRouter's catalog on 2026-10-10.
- [ ] Review provider retention/training and disclose CV/job processing clearly.
- [ ] Enforce reviewed routing/data-collection preferences; prevent paid plugins
  or model fallbacks from bypassing the $0 policy.
- [ ] Keep deployment funding allowlists empty until readiness/review passes.
- [ ] Check English/Arabic extraction, fit and document quality using synthetic data.

A catalog entry is not privacy approval. If suitable free processing is unavailable,
retain manual profiles/optional personal keys rather than silently weakening privacy.
Any future paid funding needs durable monetary reservations/reconciliation.

### NEXT-05 - Manual Jobs And Profile Confirmation

- [ ] Create jobs from pasted text, with title/company/description, optional HTTP(S)
  application URL and owned collection. No automatic URL fetch or AI.
- [ ] Add manual provenance consistently to schema, validation, labels and filters.
- [ ] Preserve existing source values, job history and fetched-job deduplication.
- [ ] Let users confirm CV extraction and edit profiles manually.
- [ ] Keep generated application material optional and user-reviewed.

Done when the core profile, shortlist and application-tracking workflow works
with AI and scraping unavailable.

### NEXT-06 - Focused English/Arabic Journey

- [ ] Focus navigation on profile, jobs, companies, collections, applications and settings.
- [ ] Give advanced personal features explicit server availability rules.
- [ ] Add locale/RTL handling to the active journey, auth emails and document language.
  Keep original source text intact.
- [ ] Test fresh accounts, mixed-language text, long labels and empty/error states
  on desktop/mobile in both languages.
- [ ] Make customer-facing copy match actual workflow and source coverage.

### NEXT-07 - Reliable Discovery And Background Work

- [ ] Review two initial sources for permitted use, geography, freshness and attribution.
  Greenhouse/Lever are candidates, not comprehensive global discovery.
- [ ] Reuse scrape-run records/QStash for durable scrape/batch execution.
- [ ] Verify signatures, recorded ownership, atomic claims and duplicate delivery safety.
- [ ] Bound concurrency/traffic/retries; reconcile uncertain attempts before retrying.
- [ ] Preserve progress/cancellation and provide small failed/stuck-run operating queries.

Done when duplicate, interrupted and partially failed work cannot create duplicate
results or uncontrolled provider attempts.

## Deferred Setup And Verification

### OPS-01 - Account Emails: Deferred

- [ ] Choose/verify the sender domain/address in Resend.
- [ ] Add `RESEND_FROM_EMAIL` to the ignored primary environment and deployment.
  The local key is present; the sender is missing. Do not paste keys.
- [ ] Agree on a recipient before sending a live test email.
- [ ] Test deployed verification/recovery, expired/reused links, login after reset
  and old-session revocation using a test account.
- [ ] Confirm post-response mail delivery runs on the hosting platform and sanitized
  delivery failures are visible to the operator.

Production mail endpoints currently fail closed without configuration. Development
token logging is not production delivery. No live email was sent or existing
account password changed during this work.

### OPS-02 - Database And Storage Rehearsal

- [ ] Test recovery against the actual Neon/Drizzle adapter with disposable accounts.
- [ ] Run skipped isolation/referential-integrity coverage against an isolated database.
- [ ] Rehearse asset/lifecycle migrations and storage failure/retry behavior.
- [ ] Verify existing account IDs, credentials and relationships survive changes.
- [ ] Use explicit write opt-ins and fixture-only cleanup; do not run broad integration
  commands against the main database by default.

### OPS-03 - Residual Security And Operations

- [ ] Resolve or assess the 18 residual dependency findings. Roots include braces,
  basic-ftp in Apify's proxy stack, and migration tooling's old esbuild loader.
  Do not force-downgrade APIs to hide audit counts.
- [ ] Review password/reset-token redaction in error tracking and request logs.
- [ ] Remove private CV/provider-response content from logs and analytics.
- [ ] Review deployed authentication rate limits and abuse controls.
- [ ] Address the Sentry deprecation and existing form/compiler warning when their
  owning files are changed.
- [ ] Enable pilot mode/reviewed models only after readiness checks pass.

## Real Pilot And Later Beta

- [ ] Recruit ten real users and observe four weeks of use.
- [ ] Track relevant saved jobs, reviewed application preparation, repeat use,
  usefulness, provider cost and support time; use one feedback channel.
- [ ] Publish clear beta limits, processing, retention, export and deletion notices.
- [ ] Review evidence before a capped public beta, initially up to 50 accounts.
- [ ] Keep reading/export available when new expensive work is paused.
- [ ] Defer payments, teams and other customer modes until validated.

Real delivery, privacy approval, recruitment and four weeks of feedback cannot
be completed by mocked tests or marked done by code alone.

## Resume Order

Start with NEXT-01 (owned/private CV assets). Keep OPS-01 deferred until sender
setup is available. Then finish lifecycle/admission, reviewed models, manual
entry/bilingual workflows, durable discovery and pilot readiness.
Preserve questionnaire edits and completed work; do not restart discovery.
