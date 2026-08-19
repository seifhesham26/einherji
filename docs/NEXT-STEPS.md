# Setup & next steps

**Updated:** 2026-08-18

Sections 1–6 get the app running and deployed. Everything after that is what to
build next — all of it free.

---

# Part 1 — Setup

## 1. Prerequisites

| Thing | Notes |
|---|---|
| **Node 20+** | Developed on 22. Check with `node -v`. |
| **npm** | The repo uses `package-lock.json` — don't switch to pnpm/yarn without regenerating it. |
| **A Postgres database** | Neon's free tier is what this is built against: https://console.neon.tech |
| **An OpenRouter account** | https://openrouter.ai → Keys. The default model is a free one, so this costs nothing. |

Nothing else is needed to start. No Apify account and no paid API keys — those are
per-account and added later from inside the app.

## 2. Install

```bash
git clone <your-repo-url>
cd einherji
npm install
```

## 3. Environment variables

```bash
cp .env.local.example .env.local
```

**Five variables are required.** The app refuses to boot without them by design —
`src/lib/env.ts` validates on import, so a missing one fails immediately and names
the field rather than surfacing as a confusing runtime error later.

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon → your project → Connection string |
| `OPENROUTER_API_KEY` | https://openrouter.ai → your avatar → Keys |
| `BETTER_AUTH_SECRET` | Generate it — see below |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |

**One more you should set.** Without it, saving any API key in the app throws:

| Variable | Purpose |
|---|---|
| `CREDENTIALS_ENCRYPTION_KEY` | Encrypts stored API keys at rest (AES-256-GCM) |
| `CRON_SECRET` | Authenticates the daily run. Without it that endpoint returns 503. |

Fully optional, each degrading cleanly when absent:

| Variable | What it turns on | Without it |
|---|---|---|
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Error tracking | SDK no-ops |
| `SENTRY_ORG` + `SENTRY_PROJECT` + `SENTRY_AUTH_TOKEN` | Readable stack traces | Errors report minified |
| `QSTASH_TOKEN` + `QSTASH_CURRENT_SIGNING_KEY` + `QSTASH_NEXT_SIGNING_KEY` | One invocation per account, with retries | Daily run happens inline |

Full setup steps for each are in
[SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md#4-built--needs-an-account-to-switch-on).
The **Google Places** key is not an environment variable — it's per-account, under
Settings → Source credentials.

Generate both secrets:

```bash
node -e "console.log('BETTER_AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('CREDENTIALS_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ **`CREDENTIALS_ENCRYPTION_KEY` must decode to exactly 32 bytes**, and must be
> the *same value* everywhere the app runs. Changing it makes every already-saved
> API key permanently unreadable — there is no re-encryption path.

Genuinely optional: `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (verification emails —
without them the link is printed to the server console, which is fine for
development), `UPLOADTHING_TOKEN` (CV upload), `OPENAI_API_KEY`.

**Job source keys are not environment variables.** Adzuna, Reddit, X, SerpAPI and
Apify are all per-account, entered in the app and encrypted at rest. See section 7.

## 4. Create the database schema

```bash
npm run db:migrate
```

That applies all ten migrations. Re-run it whenever you pull changes touching
`src/lib/db/schema.ts`.

> Use `npm run db:migrate`, **not** `db:push`. The migration history is the record
> of what production has had applied to it.

## 5. Run it, and set up your account

```bash
npm run dev          # http://localhost:3000
```

Then in the browser:

1. **Register** at `/register`. Email verification is *not* required to sign in —
   you get a prompt banner instead, so a missing Resend key won't block you.
2. **Set your criteria** at `/criteria` — job titles and locations at minimum.
   Aggregators are keyword-driven, so **a scrape refuses to run without active
   criteria.** You can upload a CV here and have them filled in for you.
3. **Add target companies** at `/companies` if you want the ATS boards. Type a
   company name and it tries to resolve their board automatically. These sources
   need a company — they can't be searched blind.
4. **Pick your sources** in Settings. Sixteen work with no key at all:

   | Tier | Sources |
   |---|---|
   | Company boards (6) | Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling |
   | Aggregators (7) | RemoteOK, Arbeitnow, Jobicy, The Muse, Himalayas, We Work Remotely, HN "Who is Hiring" |
   | Freelance (2) | Freelancer.com, HN "Seeking Freelancer" |
   | Scraped (1) | LinkedIn (logged-out endpoints) |

   LinkedIn needs no key either, but it's the slowest by a wide margin — it's
   rate-limited deliberately and does a second request per job for the
   description. It will eat most of the 60-second budget on its own, so enable it
   on a run of its own rather than alongside fifteen others.

5. **Run a scrape** from the dashboard. Start with three or four sources — see the
   60-second cap under Known gaps.

That's a working install. Everything below is optional.

## 5b. Turn on the daily run

Settings → **Daily run** → Turn on. From then on the app scrapes your sources at
06:00 UTC and sends you the top 5 matches, by email or Telegram or both. Nothing
is sent on a day with no new jobs — a daily "nothing today" is how a digest ends
up in spam.

It spends one of your 50 daily scrapes and uses your own criteria and sources.

**Where it goes — pick either or both:**

- **Email** — Resend's free tier is 3,000/month and you'll send about 30. You don't
  even need a domain: leave `RESEND_FROM_EMAIL` unset and it sends from
  `onboarding@resend.dev` to your own account address. Just set `RESEND_API_KEY`.
  Without it the digest is logged to the server console, which is fine for testing.
- **Telegram** — free, no limits, no domain, no spam folder, and it lands on your
  phone. Message [@BotFather](https://t.me/BotFather) → `/newbot` for a token, then
  message your new bot once and open `api.telegram.org/bot<token>/getUpdates` to
  find your chat id. Paste both into Settings and it **sends a test message
  immediately** — if the setup is wrong you find out then, not at 6am.

The bot token is encrypted at rest like every other key and never reaches the
browser. Locally there's no cron, so the schedule only runs on Vercel.

## 6. Deploying to Vercel

1. Add all six variables from section 3 under
   **Vercel → Project → Settings → Environment Variables**.
2. Use the **same** `CREDENTIALS_ENCRYPTION_KEY` as local, or keys already saved
   through your local install won't decrypt in production.
3. Point `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` at the deployed URL, not
   localhost. **`NEXT_PUBLIC_APP_URL` matters twice over** — it's also where
   QStash sends its callbacks, so a stale localhost value silently breaks the
   daily run once the queue is enabled.
4. **Add `CRON_SECRET`** — the daily run won't work without it, and the endpoint
   refuses to run rather than accepting anonymous requests:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Vercel sends it as a bearer token automatically. `vercel.json` already
   registers the schedule.
5. Run the migrations against production:

   ```bash
   DATABASE_URL="<your production connection string>" npm run db:migrate
   ```

6. Deploy. Check the run at Vercel → your project → Cron Jobs.

> The Hobby plan caps functions at 60s and allows one cron per day; the digest
> keeps its own 4-minute ceiling and stops cleanly rather than being killed
> mid-account. On Hobby, keep the source list short enough to finish inside 60s.

---

# Part 2 — What to do next

## 7. One free signup — a seventeenth job source, about 5 minutes

**Keys are per-account**, entered under Settings → Source credentials. They're
encrypted at rest and never sent back to the browser.

> **Why not environment variables?** Rate limits and billing attach to the *key*,
> not the user. A shared key means every account draws down one quota, and an
> account that never adds its own would silently spend yours.

### Adzuna — free tier
1. Sign up at https://developer.adzuna.com/signup
2. Copy your **App ID** and **App Key**
3. Settings → Source credentials → Adzuna → **Add key** → paste both → Save
4. Enable `adzuna` in your job sources

**Both halves of a pair must be filled in.** A source with half a key counts as not
configured rather than sending a broken request — otherwise the failure looks like
a rejected key, which is a confusing thing to debug.

Same route for the paid ones later: X and SerpAPI, and Apify under
Settings → Integrations.

### Reddit — ⛔ do not enable without written approval

The adapter is built and tested, and it stays in the codebase. **It should not be
switched on as things stand.** Reddit's
[Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
sets three conditions, and this app fails all three:

1. **"You must request access and get explicit approval before accessing any
   Reddit data through our API."** Approval is required for *all* access, not just
   commercial.
2. **Commercial use needs separate written approval.** Using this to find paying
   clients for a development business is commercial.
3. **"You must not sell, license, share, or otherwise commercialize Reddit data
   without express written approval."** Message generation sends the job
   description — which for a Reddit job is the post's body text — to OpenRouter,
   and onward to the model provider. That's sharing Reddit data with third
   parties, and it applies *even if the use were non-commercial*.

Point 3 is structural rather than a missing feature: it's how message generation
works for every source.

**What you lose by skipping it:** very little. Freelancer.com and HN "Seeking
Freelancer" cover the same freelance-gig ground with no comparable restrictions.

If you ever want it: request approval through the policy page above, and describe
the commercial use honestly. Then enable the source — no code changes needed.

## 8. Sending — built, and it's manual by design

Approve a draft, then open **Messages → Ready to send**: copy the text, open the
contact's profile, send it yourself, and hit **Mark as sent**. That writes
`sentAt` and moves the lead to `message_sent`.

Sending is manual because there is nothing to automate against: `leads.email` is
never populated — the profile scraper returns no email addresses. Automating it
needs a paid email-finding service, a warmed sending domain and a GDPR lawful
basis. See [`paid-services/email-finding.md`](./paid-services/email-finding.md).

**Adding contacts is manual too.** Leads → **Add lead**. Automated hiring-manager
discovery is blocked: the Apify actor now demands a logged-in LinkedIn session
cookie, which this app deliberately doesn't use. Everything downstream works
identically whether a lead was scraped or typed in.

> Approving no longer marks a lead as contacted. It used to, which meant the
> tracker claimed outreach that hadn't happened. That now waits for the send.

## 9. When you have budget

Full ledger: [`paid-services/README.md`](./paid-services/README.md). Best value first:

1. **Upstash QStash** — free tier may well be enough. Removes the 60-second scrape cap.
2. **Apify credits** — makes "Find Managers" work.
3. The rest is optional, and I'd argue against X (~$100/mo) and proxy providers.

---

# Reference

## Commands

```bash
npm run dev                 # local dev server
npm test                    # unit tests — fast, no network, no database
npm run test:canary         # hits all 21 real job sources; confirms none have broken
npm run test:integration    # writes to the real database; needs SCRAPER_TEST_USER_ID
npm run build               # production build
npm run lint
npm run db:generate         # after changing src/lib/db/schema.ts
npm run db:migrate          # apply pending migrations
```

**Run `npm run test:canary` if scraping suddenly returns nothing.** Job boards
change their markup without warning, and that suite tells you *which* one broke
rather than leaving you guessing.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Won't start, "Invalid environment variables" | One of the five required vars is missing or malformed. The error names the field. |
| "No active criteria found" when scraping | Set titles and locations at `/criteria` first. |
| "Nothing to scrape" | No tracked companies *and* no aggregator sources enabled. |
| Saving an API key throws | `CREDENTIALS_ENCRYPTION_KEY` is missing, or doesn't decode to 32 bytes. |
| Saved keys stopped working after a deploy | `CREDENTIALS_ENCRYPTION_KEY` differs between environments. |
| "A scrape is already running" | One run at a time, per account. Cancel it, or wait — a dead run is retired after 5 minutes. |
| "Daily limit reached" | A usage quota. Limits are in `src/usage/usage.validators.ts`. |
| A source returns nothing, with no error | Run `npm run test:canary`. |

## Known gaps

- **Scrapes are capped at 60 seconds.** Selecting all 21 sources means the run
  stops partway and says so. Fewer sources per run works fine. QStash is the fix.
- **Quotas are live**, per rolling 24 hours: 50 message generations, 20 CV parses,
  25 manager searches, 50 scrapes. Adjust in `src/usage/usage.validators.ts`.
- **CVs sit on public UploadThing URLs** (AUDIT H8) — anyone with the link can read
  yours. Not yet fixed.
- **The `apify` job source is legacy and does nothing.** It's kept in the enum so
  historical rows stay readable, but its job fetcher was deleted when the
  self-hosted scraper replaced it. Selecting it produces no tasks. Apify is still
  used for "Find Managers", which is a separate path.
- **11 lint errors remain**, all cosmetic `react/no-unescaped-entities` in components.
