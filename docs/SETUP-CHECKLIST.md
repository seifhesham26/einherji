# Setup checklist — what's left

**Updated:** 2026-08-18

**Already configured:** Neon · OpenRouter · auth secrets · `CREDENTIALS_ENCRYPTION_KEY`
· Telegram (connected and tested) · Adzuna · UploadThing · SerpAPI key saved.

Everything below is outstanding. The app runs today without any of it.

---

## 1. Deploy — this is the only thing blocking the daily run

Nothing here costs money. Until it's done, the app only works when you open it and
press Scrape.

- ☐ **`CRON_SECRET` into Vercel** — read it with `grep CRON_SECRET .env.local`.
  Without it `/api/cron/daily-digest` returns 503 and the daily run never fires.
  Safe to rotate any time; nothing is encrypted with it.
- ☐ **`CREDENTIALS_ENCRYPTION_KEY` into Vercel** — must be the **same value as
  local**, or your saved Telegram token won't decrypt in production.
- ☐ **The five required vars into Vercel** — `DATABASE_URL`, `OPENROUTER_API_KEY`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.
- ☐ **Point `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` at the deployed URL**, not
  localhost.
- ☐ **Run the migrations against production** — there are 10 now; the last two
  added buckets and the lead phone/place fields:
  ```bash
  DATABASE_URL="<production url>" npm run db:migrate
  ```
- ☐ **Deploy**, then Settings → Daily run → **switch it on** with Telegram selected.
- ☐ **Check the first run** at Vercel → your project → Cron Jobs. 200 means it ran;
  401 means the two `CRON_SECRET` values don't match.

---

## 2. Worth knowing about what you've already set up

- ⚠️ **SerpAPI key is saved but does nothing.** There's no fetcher for it yet — the
  source is declared and can hold credentials, but nothing calls it. It won't
  appear in results until that adapter is written.
- ⚠️ **Uploaded CVs sit on public URLs** (AUDIT H8). Anyone with the link can read
  yours — name, address, phone, work history. Not yet fixed.

---

## 3. Optional, whenever you want

- ☐ **Resend** — email digest. You don't need it: Telegram already delivers.
  Add it if you want a copy in your inbox, or later when other people use the app
  and Telegram doesn't generalise. Free (3,000/month), and no domain required —
  set `RESEND_API_KEY` and leave `RESEND_FROM_EMAIL` unset.

---

## 4. Built — needs an account to switch on

All three work without keys: Sentry no-ops without a DSN, the daily run falls back
to running inline without QStash, and business search simply isn't offered without
a Places key. Add them when you want them.

### ☐ Sentry — error tracking

1. https://sentry.io → create a project, platform **Next.js**
2. Copy the DSN it shows you (looks like `https://abc123@o456.ingest.sentry.io/789`)
3. Set **both** of these to that same value — one is read on the server, one is
   compiled into the browser bundle:

   | Variable | Used by |
   |---|---|
   | `SENTRY_DSN` | server, proxy, cron |
   | `NEXT_PUBLIC_SENTRY_DSN` | browser |

4. Optional, only for readable stack traces in production:
   `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens,
   scope `project:releases`). Without them errors still report — just minified.
   Source-map upload stays off unless **all three** are present, so a partial
   setup can't break your build.

**What actually reports:** the cron failing, a single account's digest failing,
and each delivery channel failing. Those three were previously invisible — the
per-account one only ever reached Vercel's cron log. Scrape errors are
deliberately excluded; they already appear in the run summary and would just be
noise. Free tier is generous.

### ☐ Upstash QStash — one invocation per account

1. https://console.upstash.com/qstash
2. From the dashboard, copy:

   | Variable | Where on the page |
   |---|---|
   | `QSTASH_TOKEN` | "QSTASH_TOKEN" |
   | `QSTASH_CURRENT_SIGNING_KEY` | Signing keys → Current |
   | `QSTASH_NEXT_SIGNING_KEY` | Signing keys → Next |

   Both signing keys are needed because Upstash rotates them — during a rotation
   window either can be the valid one, and checking only one would drop work.

> ⚠️ **`NEXT_PUBLIC_APP_URL` must be your real deployed URL.** The callback
> address is built from it, so if it still says `localhost` QStash cannot reach
> your app and every message fails. This is the easiest thing to get wrong here.

**What changes:** the cron stops doing the work and instead hands out one message
per account, each landing in its own invocation with its own full timeout — plus
automatic retries on failure. Without it everything runs inline, which is fine for
one account. Free tier is likely enough.

### ☐ Google Places — business search, for your dad's factory bucket

> ⚠️ **Google requires a billing account with a card, with no free-tier exception.**
> Until that's possible, build the list by hand instead: **Leads → Import list**
> takes a pasted list of names and phone numbers. Searching Google Maps in a
> browser and copying details is normal product use — only *automated* collection
> is prohibited.

1. Google Cloud Console → create a project
2. **Enable "Places API (New)"** — not the older "Places API". They're separate
   products and this code uses the new one; enabling the wrong one gives a
   confusing 403.
3. Billing → attach a card. There's a free monthly allowance, but the API refuses
   to serve without billing enabled at all.
4. APIs & Services → Credentials → **Create API key**
5. Restrict it: **API restrictions → Places API (New)** only. Don't bother with IP
   restrictions — this is called from Vercel, whose egress addresses change.
6. In the app: Settings → Source credentials → **Google Places** → paste the key
7. Use it at **Leads → Find businesses**

No environment variable — it's per-account and encrypted at rest like every other
source key.

**Worth understanding before you use it:**

- **It's a search, not a scrape.** Results are shown and discarded; only a
  business you press *Save as lead* on is stored. Google allows keeping
  `place_id` indefinitely but gives no caching exception for names or addresses.
- **Every search is billed and spends a daily quota unit.** The field mask is
  deliberately minimal — no photos, reviews or ratings — because Places prices by
  which fields you request.
- ⚠️ **Unverified against the live API.** I have no Google Cloud account, so this
  is tested against a mocked HTTP layer only. Expect to shake something out on the
  first real search.

---

## 5. Still not built

Nothing outstanding here — everything on the earlier list has been built.

---

## 6. Won't work — don't spend time here

- ⛔ **Reddit** — free, but the
  [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
  requires approval for *any* API access, separate approval for commercial use, and
  forbids sharing Reddit data with third parties — which message generation does via
  OpenRouter. Adapter is built and stays off.
- ⛔ **Facebook** — Meta's
  [Automated Data Collection Terms](https://www.facebook.com/legal/automated_data_collection_terms)
  prohibit automated collection without prior written permission. Use a **suppliers
  bucket as a manual list** instead.
- ⛔ **Apify / Find Managers** — the actor now demands a logged-in LinkedIn session
  cookie, which this app deliberately won't use. **Buying credits changes nothing.**
  Add leads by hand instead (Leads → Add lead); everything downstream is identical.
- ⛔ **X / Twitter** — ~$100/mo and needs the paid tier for read access. Costs more
  than everything else combined and duplicates free sources. I'd skip it.
