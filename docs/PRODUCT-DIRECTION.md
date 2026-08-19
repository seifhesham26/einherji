# Product direction — an opinionated read

**Written:** 2026-08-18 · Every structural claim here was checked against the code.

You asked for two things from this app:

1. Find **work offers** — jobs for you.
2. Find **work projects** — companies that want a website, a mobile app, or an
   enterprise platform like a CRM.

And you're thinking about turning it into a SaaS.

This is my honest read. The short version: **those are two different products,
you've built the first one, and the second one is the better business — and you're
closer to it than you think.**

---

## 1. Why goals 1 and 2 aren't the same product

They look similar. They're structurally opposite.

**Job hunting:** you are the supply. Employers publish their demand as job ads.
Your work is to find ads that match you and pitch yourself into them. Demand is
*published*, so the problem is filtering.

**Client acquisition:** you are selling a service, and buyers mostly **don't
publish**. A company that needs a CRM built doesn't post "CRM wanted". The ones
who do post — Upwork, Freelancer.com — put you in a race against forty bidders
where the only lever is price. That's the worst end of the market, and it's the
end this app currently reaches.

Real agency lead-gen runs on **signals**, not listings. And you're already
collecting the best signal there is.

---

## 2. The insight: your job data is already your client pipeline

**A company posting job ads for developers is a company with a software problem
and a budget.**

If a company has five open React roles, some of them open for months, they have:

- a confirmed need
- approved budget (a headcount req *is* a budget)
- a hiring process that isn't keeping up

That is a qualified lead for "we build this as a team, as a service" — and it's a
far warmer opening than any cold pitch, because you can name the specific thing
they're struggling to staff.

**You are already scraping exactly this data and throwing the signal away.** The
app treats a job ad as something to apply to. For goal 2 it's something to sell
into. Same row in the database, opposite interpretation.

What it would take is modest, because the hard parts are built:

| Needed | Status |
|---|---|
| Job data across many companies | ✅ 16 sources working |
| Group jobs by company | ❌ `jobs` is a flat table; no company aggregate |
| Signal scoring (open roles, age, stack) | ❌ not modelled |
| A contact at that company | ⚠️ manual — Find Managers is blocked |
| Message generation | ✅ works, needs a second template |
| Approve / send / track | ✅ built today |

The gap is **one aggregate view and a scoring rule**, not a new product. That's
the highest-leverage thing you could build, and nobody packages it this way.

---

## 3. What's actually wrong with the workflow today

Verified against the code, not guessed.

### The funnel has a hole in the middle

```
Jobs (690 rows)  →  Find Managers  →  Leads  →  Messages  →  Sent
                    ⛔ BLOCKED
```

Find Managers now needs a logged-in LinkedIn session cookie, which this app
deliberately won't use. So the only bridge from "I have hundreds of jobs" to "I
have someone to talk to" is the manual Add lead form built today. Everything
downstream is healthy; the middle is severed.

### Jobs are a dead end

`jobs` has exactly one piece of state: `isProcessed`, and only Find Managers sets
it. There is no *applied*, *saved*, or *dismissed*. The Jobs page offers "Scrape"
and a filter — no per-job action at all.

So the app produces a firehose and no way to triage it. For goal 1 that's the
central missing feature: you can find jobs but you can't *work* them.

### The tracker tracks the wrong noun

The kanban board reads from `leads` — it tracks **people**, not applications. That
made sense when the product was outreach-first and every lead came from Find
Managers. With that broken, the tracker is orphaned from the main flow: you can
scrape 690 jobs and the tracker stays empty.

For job hunting the unit is the **application**. For agency work the unit is the
**opportunity**. Neither is "a person".

### One search can't serve two goals

`saveCriteria` deactivates all previous rows — **one active criteria per user**.
But your two goals need completely different searches: "Senior React Developer,
Cairo/Remote" versus "companies hiring 3+ frontend engineers". The data model
forces you to choose one and re-type it when you switch.

Saved searches, or a criteria profile per goal, is a prerequisite for doing both.

### The same job appears twice

Dedupe is `(userId, source, sourceJobId)`. A role posted to both RemoteOK and
Arbeitnow is two rows with no relationship. As source count grows this gets worse.

---

## 4. On making it a SaaS

### What's already right

Genuinely more than most side projects at this stage — most of it landed this week:

- Per-account API keys, encrypted at rest, no shared fallback
- Per-user usage quotas that survive a cold start
- Tenant isolation proven by tests that attack it as the wrong user
- Foreign keys with cascade, so a GDPR deletion actually works
- Indexes on every `user_id` filter path

### What breaks the moment there's a second paying user

**The AI bill is yours.** `OPENROUTER_API_KEY` is server-wide with no per-account
option. Every user's message generation spends your money. Free models make this
invisible today and it becomes your largest variable cost the day you switch to a
paid model. **This is the unit-economics hole and it's the first thing to fix.**

**Scraping doesn't scale past one tenant.** Runs are sequential inside a 60-second
HTTP request. With ten users that's not slow, it's broken. QStash stops being an
optimisation and becomes mandatory.

**One IP, all tenants.** Every user's scraping comes from your servers. One heavy
user gets the IP blocked and *everyone* loses that source. The circuit breaker is
module-global too, so one tenant tripping Greenhouse trips it for all.

**LinkedIn changes character.** One person scraping logged-out pages for their own
job hunt is defensible. Selling that capability to paying customers is a
materially different risk, and it's the source I'd cut first in a commercial
product.

### The strategic argument — and this is the opinionated bit

**Build for the agency, not the job seeker.**

Job-hunting tools have the worst retention dynamic in software: **success is
churn.** Your user's goal is to stop needing you. They pay for two months, get
hired, and cancel — and they were broke and price-sensitive the whole time.
That market is crowded and the willingness to pay is near zero.

Agency lead-gen inverts every one of those:

- An agency that closes **one** £10–15k project has paid for years of subscription
- Success means they renew, not cancel — finding clients is permanent
- They already budget for lead-gen; you're competing with £500/mo tools
- Your differentiator is real: **job ads as buying signals**, which is data you
  already have and competitors treat as a different category

Your own situation is the proof of the thesis. You want this for both — but only
one of them is a business you'd still be running in three years.

**My recommendation:** keep job hunting as a mode (it's built, it's useful to you,
it's a fine free tier and a lead magnet), and point the product at agencies.

---

## 5. What I'd build, in order

**1. Reconnect the funnel.** Job → opportunity, with a real status. Add
`applied` / `saved` / `dismissed` to jobs and a per-job action on the Jobs page.
Without this the app produces a pile and nothing else. Free, and it makes goal 1
actually work.

**2. Company aggregate view.** Group jobs by company: open role count, oldest
posting, stack extracted from descriptions. This is the agency product in
embryo, and it's a query plus a page — the data is already there.

**3. Saved searches.** Lift the one-active-criteria limit so "jobs for me" and
"clients for us" can coexist. Prerequisite for both goals.

**4. Retarget the tracker** at opportunities rather than people, with leads
attached to them rather than the other way round.

**5. Per-account AI keys**, before anyone else logs in. This is the one that costs
you money if you skip it.

**6. QStash.** Only genuinely urgent once step 5 implies real users.

Steps 1–3 are free, small, and unblock everything else. I'd do them in that order
before touching infrastructure.

---

## The one-line version

You've built a good job-hunting tool and a genuinely solid platform underneath it.
The job-hunting product is the weaker business. The client-finding product is the
stronger one, you're most of the way to it already, and the bridge is realising
that **the job ads you're collecting are the leads you're looking for.**
