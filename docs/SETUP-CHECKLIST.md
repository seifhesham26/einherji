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
- ☐ **Run the migrations against production** — there are 8 now, the last added
  buckets:
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

## 4. Not built yet — code needed, not just a key

- ☐ **Sentry** — error tracking. With the daily run unattended, a broken source can
  fail silently for weeks. Free tier is generous. This is the one I'd do first.
- ☐ **Upstash QStash** — removes the 60-second scrape cap, so you can run all 21
  sources in one go. Free tier is likely enough. Required before anyone else uses
  the app.
- ☐ **Google Places** — for your dad's factory bucket. Needs a `places` adapter
  *and* somewhere to put a phone number (`ScrapedJob` has no field for one).
  Needs a card on Google Cloud. Note the terms: `place_id` storable indefinitely,
  lat/long 30 days, but **name, address and rating must be fetched live**.
  Free alternatives don't work — OpenStreetMap has ~3 engineering offices in all of
  greater Cairo, verified.

---

## 5. Won't work — don't spend time here

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
