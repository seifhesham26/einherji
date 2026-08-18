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

### 1. Apify — pay-as-you-go, has free monthly credits
- **Unlocks:** "Find Managers" — the only remaining Apify dependency. LinkedIn *profiles* are auth-walled with no logged-out equivalent, so this can't be self-hosted the way job scraping was.
- **Code status:** ✅ done, and now validates its response properly (AUDIT C4). The token is per-account, saved under Settings → Integrations and encrypted at rest — Apify bills per run, so it is never shared.
- **Worth it because:** it is the only thing standing between a list of jobs and a list of people to contact.

### 2. Upstash QStash — free tier, then cheap
- **Unlocks:** removes the 60-second scrape budget. Right now selecting all 21 sources means the run gets cut off partway; you're capped at whatever fits in a minute.
- **Code status:** ❌ not built. This is Phase 3.5 in `docs/SCRAPER-PLAN.md`.
- **Worth it because:** it's the ceiling on the scraper you already have. Best value-per-pound on this list, and the free tier may well be enough.

### 3. SerpAPI — free tier, then per-search
- **Unlocks:** lead discovery via search results, without touching LinkedIn directly.
- **Sign up:** https://serpapi.com/users/sign_up
- **Code status:** ⚠️ partial. It's declared in the source registry and can hold credentials, but **there is no fetcher for it** — `source-registry.test.ts` explicitly skips it for that reason.

### 4. An email-finding service — genuinely paid
- **Unlocks:** the last product gap. See [email-finding.md](./email-finding.md) — this one needs a decision from you before any code, and there's a free option worth reading first.

### 5. X / Twitter API — roughly $100/mo
- **Unlocks:** hiring posts on X.
- **Code status:** ✅ done. Save `bearerToken` under Settings → Source credentials.
- **Honest view:** the worst value here. It costs more than everything else combined and duplicates sources you already have for free. Buy this last, if ever.

### 6. An unblocking proxy — varies a lot
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

1. **Adzuna** — £0, today. One more source for a signup form.
2. **QStash** — likely free, and it unlocks the scraper you already paid for in effort.
3. **Apify credits** — makes Find Managers real.
4. **Email finding** — only after reading the decision doc; the free option may be enough.
5. Everything else is optional and two of them I'd argue against.

---

## Caveat on the numbers

The figures above came from checking each provider while building the scraper, but
**pricing changes and I haven't re-verified it today.** Treat every number as
"check the signup link before committing". The free/paid *split* is more stable than
the amounts, and the code status is accurate as of this commit.
