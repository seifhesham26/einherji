# Setup checklist — accounts, keys and where they go

**Updated:** 2026-08-18

Everything external the app can use, what it unlocks, and whether you've done it.
Tick as you go.

**Nothing below the "Required" section is needed to run the app.** It works today
with 16 job sources and £0 spent.

---

## Required — the app won't start without these

| ☐ | Variable | Where from | Cost |
|---|---|---|---|
| ☐ | `DATABASE_URL` | [Neon](https://console.neon.tech) → project → Connection string | Free tier |
| ☐ | `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai) → avatar → Keys | Free — default model is a `:free` one |
| ☐ | `BETTER_AUTH_SECRET` | Generate (below) | — |
| ☐ | `BETTER_AUTH_URL` | `http://localhost:3000`, or your deployed URL | — |
| ☐ | `NEXT_PUBLIC_APP_URL` | Same as above | — |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`src/lib/env.ts` validates these on import, so a missing one fails immediately and
names the field.

---

## Strongly recommended

### ☐ `CREDENTIALS_ENCRYPTION_KEY` — encrypts saved API keys at rest

Without it, **saving any API key in the app throws**. Already generated in your
`.env.local`; it still needs adding to Vercel.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> ⚠️ Must be the **same value everywhere** and must decode to exactly 32 bytes.
> Changing it makes every saved key permanently unreadable — there's no
> re-encryption path. Keep a copy in a password manager.

### ☐ `CRON_SECRET` — makes the daily run possible

Without it `/api/cron/daily-digest` returns 503 and refuses to run, so **the daily
scrape never happens**. Vercel sends it as a bearer token automatically.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Vercel only. `vercel.json` already registers the 06:00 UTC schedule.

---

## Digest delivery — pick at least one

Without one of these the daily run scrapes but only logs the result to the server
console, so you'd never see it.

### ☐ Resend — email · **not done yet**

- **Sign up:** https://resend.com → API Keys
- **Set:** `RESEND_API_KEY`
- **Leave `RESEND_FROM_EMAIL` unset** — it then sends from `onboarding@resend.dev`
  to your own account address, which needs no domain
- **Cost:** free — 3,000/month, 100/day. You'll send about 30.

### ☐ Telegram — free, no domain, lands on your phone

- **Get a token:** message [@BotFather](https://t.me/BotFather) → `/newbot`
- **Get your chat id:** message your new bot once, then open
  `https://api.telegram.org/bot<token>/getUpdates` and read `message.chat.id`
- **Where:** Settings → Daily run → Connect Telegram. **Not** an env var — it's
  per-account and encrypted at rest.
- **Cost:** free, no limits.

Saving it sends a test message immediately. If it fails you'll see Telegram's own
reason — "chat not found" means you skipped the "message your bot once" step.

---

## Job sources — all optional, all per-account

Entered under **Settings → Source credentials**, never as env vars: rate limits and
billing attach to the key, so a shared one means one account drains another's quota.

### ☐ Adzuna — free tier

- **Sign up:** https://developer.adzuna.com/signup
- **Needs:** App ID + App Key (both halves, or the source stays off)
- **Unlocks:** a large mainstream aggregator; the practical stand-in for Indeed
- **Cost:** free tier

### ⛔ Reddit — do not enable

Free of charge but **not usable**. The
[Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
requires approval for *any* API access, separate written approval for commercial
use, and forbids sharing Reddit data with third parties — which message generation
does, via OpenRouter. Adapter is built and stays switched off.

### ☐ SerpAPI — free tier, then per-search

- **Sign up:** https://serpapi.com/users/sign_up
- **Status:** ⚠️ credentials can be saved but **there is no fetcher yet** — a key
  alone does nothing today
- **Would unlock:** finding contacts via public search, without touching LinkedIn

### ☐ X / Twitter — ~$100/mo

- **Sign up:** https://developer.x.com
- **Needs:** Bearer token, and the paid Basic tier (`search/recent` is a read
  endpoint; the free tier is write-only)
- **My view:** worst value on this list. Costs more than everything else combined
  and duplicates sources you already have free. Buy last, if ever.

---

## Other integrations

### ☐ Apify — ⛔ blocked, money won't fix it

- **Was for:** Find Managers
- **Status:** the actor now demands a **logged-in LinkedIn session cookie**, which
  this app deliberately won't use. Buying credits changes nothing.
- **Instead:** add leads by hand (Leads → Add lead). Everything downstream works
  the same.

### ☐ UploadThing — CV upload

- **Sign up:** https://uploadthing.com
- **Set:** `UPLOADTHING_TOKEN`
- **Cost:** free tier
- **Note:** ⚠️ uploaded CVs sit on public URLs (AUDIT H8). Anyone with the link can
  read yours. Not yet fixed.

### ☐ Google Places — for your dad's factory bucket

- **Sign up:** Google Cloud Console → enable Places API (needs a card on file)
- **Status:** ❌ **not built.** Needs a `places` source adapter and a phone-number
  field — `ScrapedJob` has nowhere to put one.
- **Terms to know before building:** `place_id` may be stored indefinitely,
  lat/long for 30 days, but **name, address and rating have no caching exception**
  and must be fetched live.
- **Why not free alternatives:** OpenStreetMap has ~3 engineering offices in all of
  greater Cairo. Verified. Not viable.

### ⛔ Facebook — for clothing suppliers

**Not possible.** Meta's
[Automated Data Collection Terms](https://www.facebook.com/legal/automated_data_collection_terms)
prohibit collecting data by automated means without prior written permission, and
they run a dedicated anti-scraping team. Group and page content is exactly what's
off-limits.

Use a **suppliers bucket as a manual list** instead — add them by hand and track
conversations. That's what that bucket kind is for.

### ☐ Sentry — error tracking

- **Status:** ❌ not wired up, despite being in `CLAUDE.md`'s stack list
- **Why it matters:** with the daily run unattended, a broken source can fail
  silently for weeks
- **Cost:** free tier is generous

### ☐ Upstash QStash — removes the 60-second scrape cap

- **Status:** ❌ not built
- **Why:** selecting all 21 sources means the run stops partway. Also required
  before more than one person uses this.
- **Cost:** free tier may well be enough

---

## Deployment checklist

- ☐ All five required variables in Vercel
- ☐ `CREDENTIALS_ENCRYPTION_KEY` — **same value as local**
- ☐ `CRON_SECRET` — or the daily run never fires
- ☐ `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` point at the deployed URL, not localhost
- ☐ `npm run db:migrate` against production (8 migrations)
- ☐ At least one digest channel connected
- ☐ Daily run switched on in Settings

---

## Quick status

| Thing | Needed to run? | Cost | Built? |
|---|---|---|---|
| Neon, OpenRouter, auth secrets | **Yes** | Free | ✅ |
| `CREDENTIALS_ENCRYPTION_KEY` | For saving keys | Free | ✅ |
| `CRON_SECRET` | For the daily run | Free | ✅ |
| Resend | For email digest | Free | ✅ |
| Telegram | For phone digest | Free | ✅ |
| Adzuna | No | Free | ✅ |
| UploadThing | For CV upload | Free | ✅ |
| SerpAPI | No | Free tier | ⚠️ no fetcher |
| X / Twitter | No | ~$100/mo | ✅ |
| Reddit | No | Free | ⛔ terms |
| Apify | No | Paid | ⛔ blocked |
| Google Places | No | Paid | ❌ not built |
| Facebook | No | — | ⛔ prohibited |
| Sentry | No | Free | ❌ not built |
| QStash | No | Free tier | ❌ not built |
