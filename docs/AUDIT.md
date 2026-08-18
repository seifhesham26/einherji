# Einherji — Code Audit & Opinion

**Date:** 2026-08-17 · **Findings updated:** 2026-08-18
**Reviewed at commit:** `5d16c4d`
**Reviewer:** Claude (Opus 5)

> **Status update (2026-08-18): all four Criticals are closed, as are H2, H5, H6, H7, M1 (partly), M3 and M9.** The verdict below is preserved as written on 2026-08-17: it describes commit `5d16c4d`, not today's code. Each section carries its own status line.
>
> Still open and worth knowing about: **H1** (nothing is ever sent — and it is blocked, see below), **H3/H4** (env and tRPC URL handling), **H8** (uploaded CVs sit on public URLs), and the scraper's 60-second run budget (`docs/SCRAPER-PLAN.md` Phase 3.5).

This is an honest, unvarnished review of the project as it stands. Every finding below was verified against the actual code — not guessed. Where I could prove something with a build, a lint run, or the bundled Next.js docs, I did, and I say so.

---

## Verdict up front

The architecture is genuinely good. The domain-first onion structure (`validators → db → service → router`) is applied consistently across all five domains, the tRPC wiring is clean, and the UI is well beyond typical self-study quality. `npx tsc --noEmit` passes with zero errors. `npx next build` succeeds.

**But the app is not secure, and the core feature has never been proven to work.**

Two things dominate everything else:

1. **The auth middleware is a no-op.** A one-character logic bug means it never blocks anyone, ever.
2. **Four tRPC procedures have no ownership check.** Any logged-in user can read and modify any other user's data by guessing an ID.

Beyond that, the Apify scraping layer — the feature the entire product is named after — is written against an actor input schema that was never verified, with the response force-cast through `as unknown as`. If those field names are wrong, the first real scrape throws a database NOT NULL violation.

Fix the security issues before this touches a real user. Fix the Apify layer before you believe any of it works.

---

## Severity legend

| | Meaning |
|---|---|
| 🔴 **Critical** | Exploitable now, or the feature is broken. Fix before any deploy. |
| 🟠 **High** | Will cause data loss, wrong behavior, or real cost. Fix soon. |
| 🟡 **Medium** | Correctness or maintenance debt. Fix when you touch the area. |
| 🔵 **Low** | Polish, consistency, nice-to-have. |

---

# 🔴 Critical

## C1 — The auth middleware never runs its check ✅ FIXED (2026-08-18)

**Resolved.** `"/"` is now an exact match rather than a prefix, and the check uses Better Auth's `getSessionCookie` instead of `auth.api.getSession` — an optimistic cookie read with no database round trip, which is the pattern Better Auth recommends for middleware and which also sidesteps H5. Real validation stays in `protectedProcedure`.

Two things surfaced only once the code actually ran (it never had before):

- **`/api/*` had to be excluded.** With the matcher as written, unauthenticated tRPC calls were answered with a 307 to an HTML login page instead of a 401 JSON body — the client can't parse that. API routes now pass through and answer with their own status codes.
- **The `next=` param needed an open-redirect guard.** `router.push("//evil.com")` navigates off-site, so `resolveDestination` accepts only single-slash relative paths. Covered by `resolve-destination.test.ts`.

Verified end to end against a running server: all eight protected pages 307 to `/login?next=…`, the four public routes 200, tRPC returns 401 with no cookie, and a forged session cookie gets past the proxy (by design) but is rejected by tRPC.


`middleware.ts:14-17`

```ts
const PUBLIC_PATHS = ["/login", "/register", "/verify-email", "/api/auth", "/"];

if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
  return NextResponse.next();
}
```

`"/"` is in the list, and **every** pathname starts with `"/"`. So `.some()` is always `true`, the function always returns early, and `auth.api.getSession` is never reached. The redirect-to-login below it is dead code.

The `isLandingPage` helper right above it is defined and never called — probably the leftover of the correct approach.

**Why it hasn't bitten you yet:** `protectedProcedure` still guards the tRPC layer, so the *data* is safe. But every dashboard page shell renders for anonymous visitors — they see the full authenticated layout with empty/erroring panels instead of a login redirect.

**Fix:**

```ts
const PUBLIC_PREFIXES = ["/login", "/register", "/verify-email", "/api/auth"];

const isPublic =
  pathname === "/" || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
if (isPublic) return NextResponse.next();
```

---

## C2 — Four procedures let any user touch any other user's rows (IDOR) ✅ FIXED (2026-08-18)

**Resolved, all four.** C2d (`jobs.findManagers`) was fixed incidentally during the scraper work; C2a, C2b and C2c were fixed here. `userId` is now a required argument on every function in `leads.db.ts` and `messages.db.ts` that touches a user-scoped row, and it is in the `WHERE` clause rather than checked in the service layer. `patchLead` throws `NOT_FOUND` when nothing matches, so the response can't be used to probe for other users' ids.

Proven by `src/server/tenant-isolation.integration.test.ts`, which runs the real services against the real database as the wrong user and asserts both that the call is refused **and** that nothing was written — plus a positive control confirming the owner can still edit their own lead.


This is the most serious finding. The `protectedProcedure` middleware proves you are *someone*, but four procedures never check you are *the right someone*. `ctx.session.user.id` is available and simply not used.

### C2a — `leads.update`

`src/leads/leads.router.ts:14-18` → `leads.service.ts:11` → `leads.db.ts:35`

```ts
update: protectedProcedure
  .input(updateLeadSchema)
  .mutation(async ({ input }) => {   // ← ctx destructured away entirely
    return patchLead(db, input);
  }),
```

```ts
// leads.db.ts
.where(eq(leads.id, id))   // ← no userId
```

Any authenticated user can change the status, notes, and follow-up date of **any lead in the database**.

### C2b — `messages.approve`

`src/messages/messages.router.ts:26-30` → `messages.service.ts:52` → `messages.db.ts:58`

Same shape — `ctx` is not destructured. `approveMessage` filters on `messageId` alone. Worse, it then calls `setLeadMessageSent(db, updated.leadId)`, so approving a stranger's message also flips **their** lead to `message_sent` and stamps `lastContactedAt`.

### C2c — `messages.generate` (data exfiltration)

`src/messages/messages.service.ts:19-22`

```ts
const [lead, activeCriteria] = await Promise.all([
  getLeadById(db, input.leadId),      // ← no userId filter
  getActiveCriteria(db, userId),      // ← correctly scoped
]);
```

`userId` is passed to the function and used for criteria — but not for the lead. Supply another user's `leadId` and their hiring manager's name, title, headline, `about` section, and recent posts are fed into an LLM prompt and the generated text is saved to **your** account. That is a cross-tenant read of scraped personal data.

### C2d — `jobs.findManagers`

`src/jobs/jobs.service.ts:44-46`

```ts
const [job, settings] = await Promise.all([
  getJobById(db, jobId),                // ← no userId filter
  getSettingsByUserId(db, userId),
]);
```

Same pattern. You can read another user's job row, spend your own Apify credits scraping against it, and then `markJobProcessed(db, jobId)` **writes to their row**, flipping their job to processed.

### The fix

Push `userId` all the way down to the `WHERE` clause. Not a service-layer `if` — the query itself:

```ts
// leads.db.ts
export async function getLeadById(db: Database, userId: string, leadId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
    .limit(1);
  return lead ?? null;
}

export async function updateLead(db: Database, userId: string, updateData: UpdateLeadInput) {
  // ...
  .where(and(eq(leads.id, updateData.id), eq(leads.userId, userId)))
}
```

Apply the same to `getJobById`, `markJobProcessed`, and `approveMessage`. Then thread `ctx.session.user.id` through every router that currently drops it.

**Worth doing once:** make `userId` a *required first argument* on every `.db.ts` function that touches a user-scoped table. Then forgetting it becomes a TypeScript error rather than a silent vulnerability. That single convention would have prevented all four of these.

---

## C3 — SSRF: the CV parser fetches any URL you hand it ✅ FIXED (2026-08-18)

**Resolved.** `assertSafeUrl()` (`src/lib/scrapers/http/assert-safe-url.ts`) now guards the fetch: http(s) only, no embedded credentials, and the hostname is resolved and checked against every private, loopback, link-local and metadata range before connecting. The validator narrows the scheme, the upstream status is no longer echoed back (it was a port scanner), and the download is size-capped. Covered by `assert-safe-url.test.ts`.

The same guard was needed for the scraper's careers-URL fetch, which is what prompted writing it — see the note at the end of this section.

`src/criteria/criteria.validators.ts:20` and `src/lib/cv-parser.ts:14-17`

```ts
export const extractFromCvSchema = z.object({
  cvUrl: z.string().url(),   // ← any URL at all
  model: z.string().optional(),
});
```

```ts
const response = await fetch(cvUrl);   // server-side, unrestricted
```

The only validation is "is this a URL." An authenticated user can point this at `http://169.254.169.254/latest/meta-data/` (cloud instance metadata), at `http://localhost:*`, or at any host inside your network perimeter. The server fetches it and — even when PDF parsing fails — the response status and timing leak information about what is reachable.

**Fix as applied:** pinning to the UploadThing host was the original suggestion, but a general guard turned out to be the better buy — the scraper grew a second user-supplied URL (a company's careers page) that genuinely can point anywhere on the public internet, so it needs address filtering rather than a host allowlist. One guard now covers both. Redirects are re-checked at every hop, because a public URL that 302s to `169.254.169.254` walks straight through a validate-once check.

The original host-pinning suggestion, for reference:

```ts
const UPLOADTHING_HOSTNAME_SUFFIX = ".ufs.sh";

export const extractFromCvSchema = z.object({
  cvUrl: z
    .string()
    .url()
    .refine((rawUrl) => {
      const { protocol, hostname } = new URL(rawUrl);
      return protocol === "https:" && hostname.endsWith(UPLOADTHING_HOSTNAME_SUFFIX);
    }, "CV must be an uploaded file"),
  model: z.string().optional(),
});
```

The stronger version: don't accept a URL from the client at all. Store the uploaded file key server-side in `onUploadComplete`, have the client send only that key, and resolve the URL on the server.

---

## C4 — The Apify integration is unverified and will crash on bad field names ✅ FIXED (2026-08-18)

**Resolved, both halves.** `scrapeLinkedInJobs` was dead code once the self-hosted scraper landed — nothing imported it — so it was deleted outright along with the company-size filter helpers only it used. That removes half the risk surface rather than guarding it.

`findHiringManagers` now parses its response instead of casting it. Every record goes through a Zod schema via `parseArrayLeniently`, so one malformed profile can't discard the batch. Records with no usable name are dropped before the insert, which is exactly the crash described below: `firstName` and `company` are NOT NULL on `leads`, so a renamed field became `undefined` and then a Postgres violation three layers down.

I still cannot verify the actor's *input* schema without a paid run, so the fix is defensive rather than confirmatory — but the failure mode is now a clear message instead of a 500. If every record fails while the actor did return data, it raises `ApifyResponseError` saying the output shape has changed, rather than reporting zero managers found — which would be indistinguishable from a company genuinely having none.

The schema also accepts common field-name variants (`fullName`/`name` split into first and last, `profileUrl`/`url`, `summary`), since profile scrapers differ on these. Covered by `src/lib/apify/parse-profiles.test.ts`, which stubs the SDK and costs nothing to run.


`src/lib/apify/client.ts:88-100`

```ts
const run = await apify.actor("curious_coder/linkedin-jobs-scraper").call({
  searchTerms: input.titles,
  location: input.locations.join(", "),
  dateSincePosted: `past ${input.daysPosted ?? 7} days`,
  companySize: buildCompanySizeFilter(...),
  salary: input.salaryMin ? `${input.salaryMin}+` : undefined,
  industry: input.industries?.join(","),
  maxResults: MAX_JOBS_PER_SCRAPE,
});

const { items } = await apify.dataset(run.defaultDatasetId).listItems();
return items as unknown as ScrapedJob[];   // ← zero runtime validation
```

Three compounding problems:

1. **The input keys were never verified against the actor's real schema.** These read like plausible guesses. Apify actors silently ignore unknown input keys — so a wrong key name doesn't error, it just returns unfiltered or empty results. Your salary/company-size/industry filters may be doing nothing at all right now and you'd have no signal.

2. **`as unknown as ScrapedJob[]` is a lie to the compiler.** It asserts a shape that nothing checked. This is precisely the double-cast that CLAUDE.md's "no `any`, narrow `unknown`" rule exists to prevent.

3. **The lie becomes a crash one layer down.** `jobs.db.ts:26-40` inserts straight into columns declared `.notNull()`:

   ```ts
   title: job.title,       // NOT NULL
   company: job.company,   // NOT NULL
   jobUrl: job.jobUrl,     // NOT NULL
   ```

   If the actor returns `companyName` instead of `company`, or `link` instead of `jobUrl`, you get a Postgres `null value in column "company" violates not-null constraint` — a raw 500, not a useful error.

**Also:** `apifyId` is nullable, and the dedupe index is `uniqueIndex("jobs_user_apify_idx").on(userId, apifyId)`. Postgres treats `NULL` values as **distinct** in unique indexes. So if the actor's ID field isn't literally `id`, every `apifyId` is `NULL`, no two rows ever conflict, `onConflictDoNothing()` never fires, and **every scrape duplicates every job**.

**Fix — validate at the boundary.** You already have Zod; use it where untrusted data enters:

```ts
const scrapedJobSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  company: z.string().min(1),
  jobUrl: z.string().url(),
  companySize: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  description: z.string().optional(),
  postedAt: z.string().optional(),
});

const { items } = await apify.dataset(run.defaultDatasetId).listItems();
// Skip malformed records rather than failing the whole scrape
const parsed = items.map((item) => scrapedJobSchema.safeParse(item));
return parsed.filter((result) => result.success).map((result) => result.data);
```

**Before any of that:** do one manual run of both actors in the Apify console, capture the real input schema and one real output record, and write them into `docs/`. Everything in this file is currently built on an assumption nobody has tested.

`findHiringManagers` has the identical problem — `searchQuery`, `companyName`, `limit` are unverified, and `ScrapedProfile` is force-cast the same way. `insertLeads` then writes `firstName` and `company` into NOT NULL columns.

---

# 🟠 High

## H1 — Nothing is ever sent. The product stops at "approve." ⛔ BLOCKED (verified 2026-08-18)

**This cannot be built as things stand.** `leads.email` exists on the table and **nothing ever writes to it** — `findHiringManagers` returns names, titles, headlines and profile URLs, but no email address. So there is no address to send to.

Finishing this needs a decision first, not code:

1. **Add an email-finding step** (Hunter.io, Apollo, Clearbit) — a paid dependency, and it changes what the app is doing with personal data.
2. **Send on LinkedIn instead** — not possible without automating a logged-in session, which is against their terms and is exactly the line the scraper work deliberately stayed behind.
3. **Change the flow to assisted rather than automated** — generate the message, then hand it to the user to send themselves. No new dependency, and it keeps the compliance surface where it is now.

Option 3 is the smallest honest version and would make the product complete end to end.

These three options are written up properly, with the compliance and deliverability trade-offs, in [`docs/paid-services/email-finding.md`](./paid-services/email-finding.md).


Verified by grep: **nothing in `src/` ever writes `sentAt` or sets status to `"sent"`.** The column and the enum value exist; no code path reaches them.

What actually happens on approve (`messages.service.ts:52-58`):
- Message status → `"approved"` or `"edited"`
- `setLeadMessageSent()` → lead status → `"message_sent"`, `lastContactedAt` → now

So the lead is marked "Message Sent" when no message was sent. The user still has to manually copy the text into LinkedIn. Your CRM data is describing something that didn't happen, and every downstream metric inherits that lie.

This is a legitimate product decision (LinkedIn automation is a ToS minefield, and I'd push back hard on automating it). But then the UI should say so. Rename the status to `ready_to_send`, add an explicit "Mark as sent" action that stamps `sentAt`, and let the user confirm the thing they actually did.

## H2 — No ownership means no rate limit means no cost ceiling ✅ FIXED (2026-08-18, migration 0005)

**Resolved.** A `usage_events` table records one row per billable action, and `consumeQuota` enforces a rolling 24-hour cap per user per action: 50 message generations, 20 CV parses, 25 hiring-manager searches, 50 scrapes.

Backed by Postgres rather than an in-memory counter **because this runs on Vercel** — a process-local limiter resets on every cold start and caps nothing at all.

Two deliberate choices:

- **The quota is charged before the work, not after.** A completion that fails partway can still have been billed by the provider, so counting only successes would leave a retry loop free to spend without limit.
- **The check and the insert are not atomic.** Two simultaneous requests can both pass on the last unit. That bounds the overshoot to the number of concurrent requests instead of leaving the ceiling unbounded, which is all this needs to do — a lock per call would cost more than the unit it protects.

`usage.getQuotas` exposes the remaining allowance so the UI can warn before a user hits a wall mid-task. Covered by `src/usage/usage.integration.test.ts`, including per-user and per-action separation and that a failed attempt still counts.


`jobs.scrape`, `jobs.findManagers`, `messages.generate`, and `criteria.extractFromCv` all call paid third-party APIs. There is no rate limiting, no debounce, no per-user quota, no daily cap.

Anyone with an account can hold the "Scrape Jobs" button and burn your `APIFY_API_TOKEN` fallback and your `OPENROUTER_API_KEY` without limit. CLAUDE.md lists Upstash in the stack; it isn't installed. This is the single highest-value thing to add after the security fixes.

Minimum viable version: `@upstash/ratelimit` on the four expensive procedures, plus a hard daily counter per user.

## H3 — The tRPC client hardcodes an absolute URL from env

`src/components/layout/providers.tsx:50`

```ts
httpBatchLink({
  url: `${clientEnv.NEXT_PUBLIC_APP_URL}/api/trpc`,
})
```

`NEXT_PUBLIC_*` values are **inlined at build time**. On a Vercel preview deploy the app is served from `einherji-abc123.vercel.app` but the client will POST to whatever `NEXT_PUBLIC_APP_URL` was baked in — production, or `localhost:3000`. Result: cross-origin requests that fail CORS, or a preview build silently writing to your production database.

**Fix:** the tRPC endpoint is same-origin. Use a relative path.

```ts
httpBatchLink({ url: "/api/trpc", transformer: superjson })
```

(Keep `NEXT_PUBLIC_APP_URL` for absolute links in emails — that's a legitimate use.)

## H4 — `env.ts` lies to the type system on the client

`src/lib/env.ts:47-53`

```ts
export const env = typeof window === "undefined"
  ? validateEnv(serverEnvSchema, process.env as Record<string, string | undefined>)
  : validateEnv(clientEnvSchema, { ... }) as z.infer<typeof serverEnvSchema>;
//                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

That cast tells TypeScript the client-side `env` has `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `OPENROUTER_API_KEY`. It does not — they're `undefined` at runtime. So this compiles cleanly in a `"use client"` component:

```ts
const key = env.OPENROUTER_API_KEY;  // ✅ typechecks, ❌ undefined at runtime
```

You've done the hard part right — `clientEnv` exists and is correctly typed. The cast defeats it. Remove it and let `env` be server-only:

```ts
export const env = validateEnv(serverEnvSchema, process.env as Record<string, string | undefined>);
export const clientEnv = validateEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
```

Add `import "server-only"` at the top of a `env.server.ts` and split the two files. Then importing server env from a client component is a build error, which is what you want.

## H5 — Session lookup runs a database query on every single request

**Largely addressed (2026-08-18) as a side effect of C1:** the proxy now uses `getSessionCookie`, so navigations no longer hit the database. `protectedProcedure` still validates against the database per tRPC call, which is the correct place for it.


`middleware.ts:20` calls `auth.api.getSession({ headers })`, which hits Postgres.

Next.js 16's own docs (`node_modules/next/dist/docs/01-app/02-guides/authentication.md:1031`) are explicit:

> since Proxy runs on every route, including prefetched routes, it's important to only read the session from the cookie (optimistic checks), and **avoid database checks to prevent performance issues**.

Every `<Link>` prefetch, every static asset that slips past the matcher, every navigation — one Neon round trip. On serverless with cold starts this is both slow and expensive.

**Fix:** use Better Auth's cookie-only helper for the optimistic redirect, and keep the real check where it already correctly lives (`protectedProcedure`).

```ts
import { getSessionCookie } from "better-auth/cookies";

const sessionCookie = getSessionCookie(request);
if (!sessionCookie) return NextResponse.redirect(new URL("/login", request.url));
```

**Related:** Next.js 16 renamed Middleware to **Proxy** (`docs/01-app/01-getting-started/16-proxy.md`). `middleware.ts` still works — the build output confirms it, labelling the route `ƒ Proxy (Middleware)` — but the file should be renamed to `proxy.ts` with a `proxy` export. Your own `AGENTS.md` warns about exactly this class of Next 16 drift.

## H6 — No indexes on any `userId` column ✅ FIXED (2026-08-18, migration 0003)

**Resolved.** Seven indexes added, each justified by a query that actually runs: `criteria(user_id, is_active)`, `leads(user_id, status)`, `leads(user_id, next_action_at)`, `leads(job_id)`, `messages(user_id, status)`, `messages(user_id, lead_id)`, `messages(lead_id)`. `jobs` and `scrape_runs` were already covered by the scraper work.

One correction to the original finding: `user_settings.user_id` is `.unique()`, and a unique constraint already creates an index — so it never needed one.

The two `job_id` / `lead_id` indexes aren't for reads. They're the referencing side of the foreign keys added in H7; without them every cascade or SET NULL scans the whole child table.


`src/lib/db/schema.ts`

Every query in the app filters by `userId`. The only indexes that exist are `jobs (user_id, apify_id)` and the unique constraint on `user_settings.user_id`. `leads`, `messages`, and `criteria` have **none** — every read is a sequential scan of the whole table.

Fine at 10 rows. Not fine at 10,000, and Neon bills by compute time.

```ts
export const leads = pgTable("leads", { /* ... */ }, (table) => [
  index("leads_user_id_idx").on(table.userId),
  index("leads_user_status_idx").on(table.userId, table.status),
]);

export const messages = pgTable("messages", { /* ... */ }, (table) => [
  index("messages_user_status_idx").on(table.userId, table.status),
]);

export const criteria = pgTable("criteria", { /* ... */ }, (table) => [
  index("criteria_user_active_idx").on(table.userId, table.isActive),
]);
```

## H7 — No foreign keys on `userId`, so deleting a user orphans everything ✅ FIXED (2026-08-18, migration 0004)

**Resolved.** `criteria`, `jobs`, `leads` and `messages` now reference `user(id)` with `ON DELETE CASCADE`. Deleting a user removes their data in one statement instead of leaving unreachable rows full of scraped personal data — which matters for a GDPR erasure request, not just tidiness.

The child references were set deliberately rather than uniformly:

- `leads.job_id` → **SET NULL**. A hiring manager is still a real contact after the posting they came from is gone.
- `messages.job_id` → **SET NULL**, same reasoning.
- `messages.lead_id` → **CASCADE**, because the column is NOT NULL — a message without its lead cannot exist.

**This also fixed a live bug.** `leads.job_id` was `NO ACTION`, so `deleteJobsBySource` threw a foreign key violation whenever a lead pointed at a job being removed — reachable today by turning a source off after running Find Managers. Covered by `src/server/referential-integrity.integration.test.ts`, which asserts enforcement, the SET NULL behaviour, and the cascade.


`user_settings.userId` correctly has `.references(() => users.id, { onDelete: "cascade" })`.

`criteria.userId`, `jobs.userId`, `leads.userId`, and `messages.userId` are bare `text("user_id").notNull()` — no reference, no cascade.

Delete a user and their criteria, jobs, leads, and messages stay in the database forever, unreachable and unaccounted for. That's a GDPR problem the moment you have a real user, not just a tidiness problem.

```ts
userId: text("user_id")
  .notNull()
  .references(() => users.id, { onDelete: "cascade" }),
```

## H8 — Uploaded CVs are on public URLs, and nothing records which one is yours

`src/lib/uploadthing.ts:17-19`

```ts
.onUploadComplete(async ({ file }) => {
  return { url: file.url };
})
```

Three problems in three lines:

1. **The URL is public.** UploadThing files are served from an unauthenticated CDN URL. A CV contains a full name, phone number, email, and address. Anyone with the link — or anyone brute-forcing keys — has it. Nothing expires.
2. **Nothing is persisted.** `userId` is returned by the middleware and then thrown away. There is no `cvUrl` column anywhere in the schema. Upload, extract, gone — you can't show the user which CV is active or re-run extraction without re-uploading.
3. **`file.url` is deprecated.** From `node_modules`: *"This field will be removed in uploadthing v9. Use `ufsUrl` instead."* You're on v7.7.4. Switch to `file.ufsUrl` now — same for `uploaded?.[0]?.url` in `cv-upload.tsx:52`.

Minimum fix: store `file.ufsUrl` and `file.key` on `user_settings`, and delete the file from UploadThing once extraction succeeds. You only need the text.

---

# 🟡 Medium

## M1 — `npm run lint` fails with 11 errors

**Partly addressed (2026-08-18):** `cv-parser.ts` is clean now (the `any` is gone). The remaining 11 are all `react/no-unescaped-entities` in components — cosmetic, and untouched.


The build passes because Next 16 + Turbopack doesn't run ESLint during `next build`. Run it directly and it fails:

```
✖ 17 problems (11 errors, 6 warnings)
```

- 9 × `react/no-unescaped-entities` — unescaped `'` and `"` in JSX across 6 components
- 1 × `@typescript-eslint/no-explicit-any` — `cv-parser.ts:54`
- 1 × `react-hooks/incompatible-library` — `form.watch()` in `criteria-form.tsx`
- Unused: `useRouter` (`header.tsx:4`), `gte` (`jobs.db.ts:1`), `OpenAI` and `env` (`cv-parser.ts:1-2`)

The `any` is a direct CLAUDE.md violation ("No `any`. Use `unknown` and narrow it."). Most of the rest is `--fix`-able. **This should be a pre-commit hook** — CLAUDE.md lists Husky and lint-staged in the stack and neither is installed.

## M2 — AI errors are detected by substring-matching the message

`src/lib/cv-parser.ts:53-66`

```ts
} catch (error: any) {
  const msg = error.message || String(error);
  if (msg.includes("429") || msg.includes("rate limit") || ...) {
```

The intent is good — these are genuinely useful user-facing messages, and mapping provider failures to actionable text is the right instinct. The mechanism is fragile: any provider wording change silently breaks the branch and the user gets a raw stack trace.

The OpenAI SDK throws `APIError` with a real `status` field. Use it:

```ts
import { APIError } from "openai";

} catch (error: unknown) {
  if (error instanceof APIError) {
    if (error.status === 429) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "..." });
    if (error.status === 404) throw new TRPCError({ code: "BAD_REQUEST", message: `Model ${model} is unavailable.` });
    if (error.status === 402) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient credits." });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "CV extraction failed." });
}
```

Also: this logic belongs in one shared place. `generateOutreachMessage` in `ai/client.ts` has **no** error handling at all — the same rate limit that produces a friendly message during CV parsing produces a raw 500 during message generation.

## M3 — `criteria.extractFromCv` skips the service layer ✅ FIXED (2026-08-18)

**Resolved.** The router now calls `extractCv` in `criteria.service.ts` rather than reaching into `lib/cv-parser` directly. That's also what gave the CV-parse quota somewhere to live — the procedure had dropped `ctx` entirely, so it had no user id to charge.


`src/criteria/criteria.router.ts:16-20` calls `extractCvFromUrl` from `@/lib/cv-parser` directly. Every other procedure in the codebase goes router → service → db. This one goes router → lib.

CLAUDE.md is explicit that a service file owns business logic. Right now "which model to use", "what to do when extraction returns nothing", and "should we persist this" have no home. Add `extractCriteriaFromCv` to `criteria.service.ts` and route through it — that's also where the model fallback and the future "save the URL" logic belong.

## M4 — Saving criteria is two non-atomic writes and grows without bound

`src/criteria/criteria.service.ts:10-14`

```ts
await deactivateUserCriteria(db, userId);
return insertCriteria(db, { ...criteriaData, userId });
```

If the insert fails, the user is left with **zero** active criteria — and `scrapeAndSaveJobs` then throws `"No active criteria found"` on every attempt. The user's only recovery is to re-save the form, with no indication of what went wrong.

Also, nothing ever deletes the deactivated rows. Save the form fifty times and you have fifty rows. That's an accidental audit log — if you want history, make it deliberate with a `criteria_history` table; if you don't, `UPDATE` the existing row.

Wrap both writes in `db.transaction()`. Note: this requires switching from `drizzle-orm/neon-http` to `neon-serverless` (the HTTP driver doesn't support interactive transactions) — a real change worth making before you need it.

## M5 — `insertLeads` has no dedupe, so re-running "Find Managers" duplicates everyone

`src/leads/leads.db.ts:29-32` is a plain insert with no `onConflictDoNothing` and no unique constraint backing it. `findAndSaveManagers` sets `isProcessed = true` afterward, but nothing *prevents* running it again — and the UI has no guard.

Two clicks, two copies of every hiring manager, two Apify charges.

```ts
uniqueIndex("leads_user_linkedin_idx").on(table.userId, table.linkedinUrl)
```

Same NULL caveat as C4: if `linkedinUrl` comes back null, the constraint won't fire. Validate it as required at the boundary.

## M6 — Two counters read every row and count in JavaScript

`jobs.db.ts:52-62` and `messages.db.ts:70-84` both do `SELECT *` and then `.filter().length` / `.length` in Node.

```ts
const allJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
const scrapedToday = allJobs.filter((job) => job.createdAt && job.createdAt >= today).length;
```

Every job row — including full `description` text — crosses the wire to compute a number. Push it into SQL:

```ts
import { count, sql } from "drizzle-orm";

const [stats] = await db
  .select({
    total: count(),
    scrapedToday: count(sql`CASE WHEN ${jobs.createdAt} >= ${today} THEN 1 END`),
    processed: count(sql`CASE WHEN ${jobs.isProcessed} THEN 1 END`),
  })
  .from(jobs)
  .where(eq(jobs.userId, userId));
```

## M7 — `getApprovedTodayCount` undercounts every edited message

`messages.db.ts:76-79` filters `eq(messages.status, "approved")`. But `approveMessage` sets status to `"edited"` when the user tweaked the text — and users tweak the text constantly; that's the whole point of the approval queue.

So the dashboard's "approved today" number silently excludes every message the user actually engaged with. Ironically it undercounts exactly the ones they cared about most.

`"approved"` and `"edited"` are not mutually exclusive states — one is a status, the other is a provenance flag. Use `inArray(messages.status, ["approved", "edited"])` for now; longer term, `status` + a separate `wasEdited: boolean` models this correctly.

## M8 — Side effect during render in `Providers`

`src/components/layout/providers.tsx:35-45`

```ts
useState(() => {
  queryClient.getQueryCache().subscribe((event) => { ... });
});
```

`useState(initializer)` is being used as "run this once" — but it runs **during render**, and the subscription is never cleaned up. React may invoke a render function twice (StrictMode) or discard the result entirely under concurrent rendering, so you can end up with duplicate or leaked subscribers.

The idea is right — global 401 → redirect is good design. The mechanism should be an effect:

```ts
useEffect(() => {
  const unsubscribe = queryClient.getQueryCache().subscribe((event) => { /* ... */ });
  return unsubscribe;
}, [queryClient, router]);
```

## M9 — No migration history ✅ FIXED

**Resolved.** `drizzle/` now holds an applied migration chain (0000–0004) with snapshots, replacing `db:push`.


`drizzle.config.ts` sets `out: "./drizzle"`, but that directory doesn't exist. The README instructs `npx drizzle-kit push`, which diffs and mutates the live database with no versioned record.

That's fine for solo development. It is genuinely dangerous the first time you have production data — `push` will happily drop a column to match your schema file, and there is no migration to review, no rollback, and no record of what changed.

Switch to `drizzle-kit generate` + `migrate` and commit the `drizzle/` folder before you have data you care about. This is also a prerequisite for the index and foreign-key changes in H6/H7 — you want those reviewable.

## M10 — Apify tokens are stored in plaintext ✅ FIXED (2026-08-18)

**Resolved, and it was two problems rather than one.**

*At rest:* `src/lib/crypto/secret-box.ts` encrypts with AES-256-GCM, keyed from `CREDENTIALS_ENCRYPTION_KEY` (32 random bytes, base64) held outside the database. It covers `user_settings.apify_api_token`, `user_settings.scraping_proxy_api_key`, and every value in `source_credentials.credentials`. Encryption is applied in the `.db.ts` layer, so nothing above it has to remember and nothing below it holds a readable key. GCM rather than CBC because it authenticates: a tampered ciphertext fails loudly instead of decrypting to garbage that then gets sent to a third-party API. Hashing isn't an option — the scraper has to send the real value upstream.

*In transit to the client:* `settings.get` returned the whole row, putting the raw token in TanStack Query's cache and the React tree. The service now strips it and returns `hasApifyApiToken` plus a `••••` preview. TypeScript caught the one component that depended on the old shape, which is the point of stripping it at the type level rather than at runtime.

Two consequences worth knowing:

- **Rows written before this are plaintext and are passed through unchanged**, not rejected — failing on them would lock users out of keys they already saved. Re-saving upgrades a row. `isEncrypted` distinguishes the two by a `v1.` prefix.
- **A blank token field now means "leave unchanged", not "delete".** The form can no longer pre-fill the saved value, so submitting the page after editing something else would otherwise have silently wiped the key. Removing one is deliberate, via `settings.disconnectApify`.

**Rotating `CREDENTIALS_ENCRYPTION_KEY` makes every saved key unreadable** — users would have to re-enter them. There is no re-encryption path yet.

Covered by `src/lib/crypto/secret-box.test.ts` (9 unit tests, including tamper detection and wrong-key rejection) and `src/credentials/credentials.integration.test.ts`, which reads the raw column directly to confirm ciphertext actually reaches the database — the failure mode here is a correct cipher that nothing calls.


`user_settings.apifyApiToken` is a plain `text` column. Anyone with a database read — a leaked `DATABASE_URL`, a SQL injection anywhere, a Neon branch shared for debugging — gets every user's Apify credentials.

Encrypt at rest with a key from env (Node's `crypto.createCipheriv` with AES-256-GCM is enough), and never return the token to the client. `settings.get` currently returns the full row, so the raw token is sitting in the browser's TanStack Query cache right now. Return a masked preview (`apify_api_••••4f2a`) and a `hasApifyToken: boolean` instead.

---

# 🔵 Low

| # | Finding | Location |
|---|---|---|
| L1 | `(dashboard)/page.tsx` is dead code. Both it and `app/page.tsx` resolve to `/`; the build emits a single `/` and this file is silently dropped. The comment claims it "defers to `/dashboard`" — it never runs. Delete it. | `src/app/(dashboard)/page.tsx` |
| L2 | `getJobsStats.managersFound` counts **processed jobs**, not managers. A job can yield 0 or 5 leads. The dashboard number is wrong. Count `leads` instead. | `jobs.db.ts:59` |
| L3 | `updateLead` can't *clear* `nextActionAt` — `...(nextActionAt && {...})` means a user can set a follow-up but never remove one. Use `!== undefined` and accept `null`. | `leads.db.ts:39` |
| L4 | `Header` renders an `<h1>` from `PAGE_TITLES`, and every view renders its own `<h1>` too. Two `<h1>`s per page. Make the header `<h2>` or a `<span>`. | `header.tsx:56` |
| L5 | `PAGE_TITLES` maps `"/"` → `"Dashboard"`, but `/` is the landing page and isn't in the dashboard layout. Dead entry. | `header.tsx:12` |
| L6 | Global `staleTime: 20 * 60 * 1000` with `refetchOnWindowFocus: false` — for CRM data edited across tabs, 20 minutes of staleness is a long time. Deliberate invalidation covers the main flows, but consider a shorter default with per-query overrides. | `providers.tsx:20` |
| L7 | Kanban drag has no optimistic update. The card visually snaps back until the server round-trip completes and the invalidation lands. `onMutate` + `setQueryData` would fix the jank. | `kanban-board.tsx:32` |
| L8 | `buildCompanySizeFilter` only matches four exact `(min, max)` pairs and returns `""` for everything else. The criteria form uses a **slider** (`companySizeMin: 1, companySizeMax: 5000`), so the filter is almost always empty. Map ranges to LinkedIn's buckets by overlap, not exact equality. | `apify/client.ts:145-153` |
| L9 | `daysPosted` is in `ScrapeJobsInput` and defaults to 7, but `scrapeAndSaveJobs` never passes it and it isn't in the criteria schema. Either surface it in the form or drop it. | `jobs.service.ts:26-34` |
| L10 | Components are kebab-case (`lead-card.tsx`); CLAUDE.md's Components section specifies PascalCase (`LeadCard.tsx`). The code is internally consistent and matches shadcn convention — so **update CLAUDE.md**, don't rename 40 files. Just make them agree. | CLAUDE.md |
| L11 | `AVAILABLE_MODELS` is a hardcoded list that will rot as providers deprecate models — you've already hit this twice per git history (`31bc3a5`, `c719e68`). Consider fetching OpenRouter's `/models` endpoint and caching it. | `criteria.validators.ts:3-16` |

---

# 📄 The `docs/` folder is actively misleading

This one deserves its own section, because stale docs are worse than no docs — they cost you time every time you trust them.

`docs/README.md` and everything under `docs/docs/` describe a **different application** than the one in this repository:

| `docs/` claims | Reality |
|---|---|
| Next.js 14 | Next.js 16.2.6 |
| Auth: "Clerk or NextAuth" | Better Auth |
| AI: Claude API (`claude-sonnet-4`) direct | OpenRouter, default Llama 3.3 70B free |
| REST route handlers at `app/api/apify/scrape-jobs/route.ts` etc. | tRPC — none of those routes exist |
| `lib/claude/client.ts` | `lib/ai/client.ts` |
| `components/jobs/JobCard.tsx` | `components/jobs/job-card.tsx` |
| `types/index.ts` | `types/{job,lead,message,criteria}.ts` |
| No mention of `src/{domain}/` onion structure | The central architectural decision of the codebase |

These read like the original planning documents from before the build, never updated. `07-full-build-prompt.md` in particular will actively mislead any AI agent or contributor who reads it — it describes an architecture you deliberately moved away from.

**Recommendation:** move `docs/docs/` to `docs/archive/` with a header noting it's the pre-build plan, and rewrite `docs/README.md` to describe what actually exists. The `USER_GUIDE.md` and `APIFY_SETUP.md` are worth checking against reality too.

---

# What's genuinely good

Worth stating plainly, because the list above is long and the work here is better than it suggests.

- **The domain-first onion architecture is real and consistent.** All five domains follow `validators → db → service → router` without exception. That is unusually disciplined for a self-study project, and it's why the security fixes above are mechanical rather than a rewrite — there's exactly one place to add each `userId`.
- **Zod schemas as the source of truth, with types inferred.** Done correctly everywhere. No hand-maintained duplicate interfaces.
- **`createTRPCContext` wraps `getSession` in `.catch(() => null)`** with a comment explaining that a cold-start DB timeout should produce a null session, not an HTML 500. That's the kind of thing you only write after getting burned — and the comment captures the *why*, exactly as CLAUDE.md asks.
- **The comment style throughout follows your own standard.** `// Deduplicate per user — same job can appear for different users`, `// Replace existing draft — regeneration shouldn't stack up multiple drafts`. These explain reasoning, not mechanics.
- **`upsertDraftMessage`** correctly prevents draft pileup on regenerate. Easy to get wrong, handled properly.
- **The AI prompt engineering is strong.** Explicit negative constraints ("NEVER use generic openers"), a word ceiling, per-template instructions, and a `referral` template that deliberately does *not* ask for a job. That's real domain understanding, not a generic "write a message" prompt.
- **`getClient(model)` routing** — direct OpenAI when a key exists and the model is `gpt-*`, OpenRouter otherwise — is a clean solution to a genuinely fiddly problem.
- **The UI is well past prototype quality.** Skeleton loaders, empty states with clear next actions, drag-and-drop kanban, `richColors` toasts, theme toggle, an unverified-email banner that's informative rather than blocking. The auth-error → redirect subscription in `Providers` is a thoughtful touch (even if the mechanism needs fixing).
- **`tsc --noEmit` is clean and `next build` succeeds.** The type discipline is real — which makes the two `as unknown as` casts stand out all the more, since they're the only places it was abandoned.

---

# Recommended order of work

**Before this touches a real user:**

1. ~~**C1** — fix the middleware `startsWith("/")` bug (one line)~~ — done 2026-08-18. Not one line in the end: activating dead code exposed an API-redirect bug and an open redirect.
2. ~~**C2** — add `userId` to all four unscoped queries; make it a required first arg on every `.db.ts` function~~ — done 2026-08-18, with live cross-tenant tests
3. ~~**C3** — pin `cvUrl` to the UploadThing host~~ — done 2026-08-18, via a general SSRF guard rather than host pinning
4. **H3** — relative tRPC URL
5. **H4** — remove the `env` cast, split server/client

**Before you trust that scraping works:**

6. ~~**C4** — run both Apify actors manually, capture the real schemas, add Zod validation at the boundary~~ — done 2026-08-18. The jobs actor was deleted rather than validated (dead code); the profile actor is validated defensively, since confirming its schema still needs a paid run.
7. **M5** — unique constraint on leads
8. **H2** — rate limit the four paid procedures

**Before you have data you care about:**

9. **M9** — switch to generated migrations
10. **H6 / H7** — indexes and foreign keys (as a reviewable migration)
11. **M10** — encrypt the Apify token, stop returning it to the client

**Then the honesty and hygiene pass:**

12. **H1** — decide what "sent" means and make the UI tell the truth
13. **M1** — fix lint, add Husky + lint-staged
14. **H8** — persist `ufsUrl`, delete the file after extraction
15. **M2** — status-code-based AI error handling, shared across both call sites
16. Rewrite `docs/`

---

*Everything in this document was verified against the code at `5d16c4d`. Build and typecheck were run; lint output is quoted verbatim; the Next.js 16 Proxy behaviour is cited from the docs bundled in `node_modules/next/dist/docs/`. The one thing I could **not** verify is the Apify actor schemas (C4) — that requires a live run, and it's the reason C4 is written as a risk rather than a confirmed bug.*
