# Paid services — deferred until there's budget

**Created:** 2026-08-18 · **Status:** nothing here is blocking

---

## The headline: none of this is stopping you

The app runs end to end **at zero cost today**. That isn't optimism — it's what the
code requires. Only five environment variables are mandatory:

| Variable | Service | Cost |
|---|---|---|
| `DATABASE_URL` | Neon | Free tier |
| `OPENROUTER_API_KEY` | OpenRouter | Free — the default model is a `:free` one |
| `BETTER_AUTH_SECRET` | — | You generate it |
| `BETTER_AUTH_URL` | — | Your own URL |
| `NEXT_PUBLIC_APP_URL` | — | Your own URL |

Everything else in `src/lib/env.ts` is `.optional()`. The default AI model is
`meta-llama/llama-3.3-70b-instruct:free`, so message generation and CV parsing
cost nothing unless you deliberately pick a paid model in Settings.

### 16 job sources already work with no key at all

| Tier | Sources |
|---|---|
| Company boards (6) | Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling |
| Aggregators (7) | RemoteOK, Arbeitnow, Jobicy, The Muse, Himalayas, We Work Remotely, HN "Who is Hiring" |
| Freelance (2) | Freelancer.com, HN "Seeking Freelancer" |
| Scraped (1) | LinkedIn (logged-out endpoints) |

All 16 are verified live by the canary suite (`npm run test:canary`).

---

## One of these is free — do it whenever you like

It's on this list only because it needs a signup, not money.

**Every key here is per-account**, entered under Settings → Source credentials and
encrypted at rest. There is deliberately no server-wide environment fallback:
rate limits and billing attach to the key, not the user, so a shared key means one
account's scraping spends another's quota.

### Adzuna — free tier
- **Unlocks:** a large mainstream job aggregator; the practical stand-in for Indeed, which has no public API.
- **Sign up:** https://developer.adzuna.com/signup
- **Code status:** ✅ done. Save `appId` + `apiKey` under Settings → Source credentials.

---

## Blocked on permission, not money

### Reddit — ⛔ approval required, do not enable

The adapter is written and tested. **It should not be switched on as things stand.**

Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
sets three conditions and this app fails all three:

1. **Approval is required for all API access** — "You must request access and get
   explicit approval before accessing any Reddit data through our API." Not just
   commercial use.
2. **Commercial use needs separate written approval.** Finding paying clients for
   a development business is commercial.
3. **Sharing Reddit data with third parties is prohibited** without express written
   approval. Message generation sends the job description — for a Reddit job, the
   post's body — to OpenRouter and onward to the model provider. This one applies
   *even if the use were non-commercial*, and it's structural: it's how message
   generation works for every source.

**Cost of skipping it:** low. Freelancer.com and HN "Seeking Freelancer" cover the
same freelance-gig ground with no comparable restrictions.

**If you want it:** request approval via the policy page, describing the commercial
use honestly. No code changes needed afterwards — just enable the source.

> A correction worth recording: this was originally listed here as "free, do it
> whenever". That was right about *price* and wrong about *permission* — the cost
> note came from the source registry, which tracks money, not terms.

---

## Actually costs money

Ordered by what I'd buy first for the money.

### 1. Google Places — pay as you go, needs a card
- **Unlocks:** business search for your dad's paper business — engineering firms,
  contractors and print shops in Cairo and Giza, with phone numbers.
- **Code status:** ✅ built and waiting for a key. Settings → Source credentials →
  Google Places, then Leads → Find businesses.
- **Blocked on:** Google requires a billing account with a card. **No free-tier
  exception** — you can't sign up without one.
- **What it actually buys you:** less typing. It does not unlock anything the
  manual route can't do, and given the data I measured, a list you build by hand
  from Google Maps is *better targeted* than a category query would be. Treat it
  as a convenience, not a capability.
- **Protect yourself when you do get a card:** APIs & Services → Places API (New)
  → Quotas → set requests-per-day to ~100. Budget alerts only email you; a quota
  is what actually prevents a charge.
- **Free alternatives don't work** — verified. OpenStreetMap across Cairo *and*
  Giza returns 6 copy shops and 1 printing business, with 30 phone numbers total,
  none of them paper buyers. LatLng, LocationIQ and Geoapify are the same OSM data
  behind a signup.

### 2. Upstash QStash — free tier, then cheap
- **Unlocks:** the daily cron stops doing the work itself and hands out one message per account, so each gets its own invocation and full timeout — plus automatic retries.
- **Code status:** ✅ built. Set `QSTASH_TOKEN` and both signing keys; without them the run happens inline, which is fine for one account.
- **Worth it because:** it's what makes the daily run survive more than one user. The free tier is likely enough on its own.

### 3. SerpAPI — free tier, then per-search
- **Unlocks:** lead discovery via search results, without touching LinkedIn directly.
- **Sign up:** https://serpapi.com/users/sign_up
- **Code status:** ⚠️ partial. It's declared in the source registry and can hold credentials, but **there is no fetcher for it** — `source-registry.test.ts` explicitly skips it for that reason.

### 4. An email-finding service — genuinely paid
- **Unlocks:** the last product gap. See [email-finding.md](./email-finding.md) — this one needs a decision from you before any code, and there's a free option worth reading first.

### 5. Apify — ⛔ blocked, and money won't fix it
- **Unlocks:** "Find Managers" — the only remaining Apify dependency.
- **Status: broken, verified 2026-08-18.** Clicking Find Managers returns
  `Field input.cookie is required, Field input.proxy is required`. The actor
  `curious_coder/linkedin-profile-scraper` now requires a **logged-in LinkedIn
  session cookie** — it drives LinkedIn as you.
- **Why we're not fixing it that way.** Supplying a session cookie means
  automating an authenticated LinkedIn session. That is the single line the whole
  scraper deliberately stays behind: every job source here uses logged-out, public
  endpoints for exactly this reason. It breaches LinkedIn's terms and puts your
  personal account at risk of restriction — a real cost, since your LinkedIn
  profile is part of how you get hired.
- **Buying Apify credits will not help.** The blocker is the cookie, not the balance.
- **The alternatives**, in order of sanity:
  1. **Find managers by hand.** For a handful of target companies this is minutes
     of work, and the rest of the pipeline (message generation, approval, send
     tracking) already works from a lead you add yourself.
  2. **A SERP API** (SerpAPI, #3 below) to find "Head of Engineering at X" from
     public search results — no LinkedIn session involved. This was always the
     Phase 4 recommendation in `docs/SCRAPER-PLAN.md`.
  3. A different Apify actor that supplies its own authentication. This shifts the
     terms problem to the actor operator rather than removing it; you'd still be
     commissioning the scrape.
- The app now fails with a plain explanation instead of a raw 500.

### 6. X / Twitter API — roughly $100/mo
- **Unlocks:** hiring posts on X.
- **Code status:** ✅ done. Save `bearerToken` under Settings → Source credentials.
- **Honest view:** the worst value here. It costs more than everything else combined and duplicates sources you already have for free. Buy this last, if ever.

### 7. An unblocking proxy — varies a lot
- **Unlocks:** Indeed, Glassdoor, Wellfound. They serve JavaScript shells or block datacenter IPs outright.
- **Code status:** ❌ not built. The `scrapingProxyProvider` / `scrapingProxyApiKey` columns exist and **nothing reads them**.
- **Honest view:** don't. This is an arms race you'd be maintaining forever, and Adzuna covers most of the same postings for free.

---

## Already integrated, free tier is likely plenty

- **Resend** — verification emails. Optional; falls back to `console.log` in dev when unset.
- **UploadThing** — CV upload. Optional.
- **Neon** — the database. Free tier.

---

## When money arrives, in this order

1. **Google Places** — the only thing on this list genuinely gated on having a
   card, and the only one that changes your dad's day-to-day. Modest pay-as-you-go
   cost, and cap the daily quota the moment you enable it.
2. **QStash** — free tier is likely enough. Removes the 60-second scrape cap.
3. **Sentry** — free tier. Worth doing before the daily run has been unattended
   for a few weeks.
4. **Email finding** — only after reading the decision doc; the free assisted-send
   path may be all you need.
5. **Not Apify.** It's on the ledger, but money doesn't fix it — the blocker is a
   LinkedIn session cookie this app won't use. Don't buy credits expecting Find
   Managers to start working.
6. **Not X.** ~$100/mo to duplicate sources you already have free.

---

## Caveat on the numbers

The figures above came from checking each provider while building the scraper, but
**pricing changes and I haven't re-verified it today.** Treat every number as
"check the signup link before committing". The free/paid *split* is more stable than
the amounts, and the code status is accurate as of this commit.
