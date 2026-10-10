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
