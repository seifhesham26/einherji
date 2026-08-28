# Enhancement plan — from firehose to workbench

**Written:** 2026-08-28 · Read against commit `f0ab01f`, branch `main`.
Every claim below was checked in the code, not inferred.

The platform underneath this app is genuinely good. The product sitting on top of it
collects hundreds of jobs and then gives you almost nothing to *do* with them. This is
what to build, in what order, and why.

| | |
|---|---|
| Lines of TypeScript in `src/` | 24,083 |
| Live job sources | 20+ |
| tRPC routers | 11 |
| Actions available on a job card | 1 |

---

## 1. The foundation is not the problem

Before the criticism: the engineering here is well above what this stage usually looks like.

Tenant isolation is proven by tests that attack it as the wrong user. API keys are
per-account and AES-256-GCM encrypted at rest. Quotas survive a serverless cold start
because they are rows, not counters. Every `user_id` filter path has an index. Foreign keys
cascade deliberately — `leads.job_id` is `set null` with a comment explaining that a hiring
manager outlives the posting they came from. There is a circuit breaker, a source registry,
a canary suite that tells you *which* board broke, and a `scrape_runs` table with a partial
unique index that makes a double-click physically unable to start two runs.

None of the plan below touches that. Every phase is product surface built on machinery that
already works.

---

## 2. Diagnosis — three structural holes

Everything that makes this frustrating to use traces back to three missing things. Not
missing polish — missing nouns and verbs.

### Hole 1 — a job has no verbs

You can scrape 690 roles and then do exactly one thing to any of them: press **Find
manager** — a feature that is blocked, because the Apify actor behind it now demands a
logged-in LinkedIn cookie this app deliberately won't use.

There is no *save*, no *applied*, no *dismiss*, no note, no reminder. So the pile only ever
grows, and the same rows get re-read forever.

> `jobs` table state columns: `is_processed`. Written in exactly one place — `jobs.service.ts:86`.

### Hole 2 — the application doesn't exist

A job hunt is measured in applications. This app has no concept of one. The Tracker board —
the thing that looks like it tracks your hunt — reads from `leads`, so it tracks **people**.

For most applications there is no person: you fill in a form and wait. Those never enter the
tracker at all. You cannot ask this app what you applied to last week.

> `kanban-board.tsx` calls `useGetLeads()`. Eight columns, all `lead_status` values.

### Hole 3 — the AI writes one thing

Five templates, and all five are a short outbound DM to a named human. The AI never reads a
job description for you, never says whether you fit it, never writes a cover letter, never
answers "why do you want to work here?".

The one genuinely useful ranking function you have — `scoreJob` — is called from the digest
email and **nowhere in the UI**.

> `score-job.ts` — the only consumer is `digest.service.ts:160`. The jobs list sorts by `posted_at`, always.

### The funnel

```
TODAY
  20+ sources ──▶ Jobs ──✕──▶ Find managers ──▶ Leads ──▶ Tracker
                   │          (needs LinkedIn     (typed     (tracks
                   │           session cookie)     by hand)    people)
                   └─▶ dead end

PROPOSED
  20+ sources ──▶ Triage ──▶ Application ──▶ Documents ──▶ Follow-up
  (queued,       (scored,   (the missing    (letter,      (scheduled,
   scheduled)     keyboard)  noun)           answers, CV)   drafted)
                                  └──── contacts attach here, optional ────┘
```

The severed link isn't worth repairing — LinkedIn closed that door. The fix is to stop
routing the hunt through a person at all, and make the application the thing that moves.

---

## 3. Defects — things that are simply wrong today

Separate from missing features.

| What breaks | Why | Where | Weight |
|---|---|---|---|
| **The daily run ignores your buckets** | The cron calls `startScrape(db, userId, {})` with no bucket, so it always runs the account-level criteria. Every bucket you built — clients, suppliers, a second job search — is skipped by the automation. | `digest.service.ts`, `runDailyDigestForUser` | Bad |
| **Every job loads into the browser** | `jobs.getAll` has no limit, no offset and no sort options. Search and the pending filter run as `Array.filter` in the client. At 690 rows it's sluggish; at 5,000 the page stops being usable. | `jobs.db.ts:6`, `jobs-list.tsx:40` | Bad |
| **"Done" means something nobody wants** | `is_processed` is the only job state and it means "we ran a hiring-manager lookup". Since that lookup is blocked, no job can ever legitimately reach Done — yet the UI has a Pending/Done badge, a Pending filter and a Clear done button built on it. | `schema.ts:198`, `job-card.tsx` | Medium |
| **Two overlapping search configs** | Criteria holds titles, locations, salary, CV, model — one active row per user. Buckets hold keywords, locations, sources, pitch — many rows. A bucket run silently drops your salary floor, because `salaryMin` only exists on criteria. | `scraping.service.ts`, query construction | Medium |
| **The same role appears twice** | Dedupe key is `(user, source, source_job_id)`. One posting syndicated to RemoteOK and Arbeitnow is two unrelated cards. Every source you add makes the list noisier. | `jobs_user_source_id_idx` | Medium |
| **Nothing ever goes stale** | Postings die in 30–60 days and nothing expires or flags them. In three months the Jobs page is mostly filled roles you can't tell apart from live ones. | no expiry field | Medium |
| **Approved messages dead-end at the clipboard** | You store `leads.phone` and `leads.email`, then offer a Copy button and nothing else. A `wa.me` link and a `mailto:` are two lines of href. | `ready-to-send-list.tsx` | Small |
| **The AI bill is yours, per user** | `OPENROUTER_API_KEY` is server-wide with no per-account option, while every other key is per-account and encrypted. Free models hide this until the day you switch models. | `lib/env.ts:8` | Medium |
| **CVs sit on public URLs** | UploadThing links are unguessable but unauthenticated. Anyone with the link reads your CV. | `lib/uploadthing.ts` | Medium |

---

## 4. The build — six phases, in dependency order

Phases 1 and 2 are the ones that change what this app *is*. Everything after compounds on
them, and nothing after them makes sense before them.

### Phase 1 — Give a job a life cycle · ~2 days · **built**

One schema change unlocks more product than everything else on this page combined. A job
stops being a search result and becomes a thing you are working. No new entity — the
application *is* the job row once it has a status, which avoids maintaining two nouns that
mean the same thing.

- **A real status enum.** `new → shortlisted → applying → applied → screening → interviewing → offer → rejected / ghosted / dismissed`. Retires `is_processed`, which becomes a migration mapping to *shortlisted*.
- **An event log per job.** Every status change, note and reminder as a row, so the job detail view has a real history and the analytics in phase 6 have something to count.
- **Score stored on the row.** `scoreJob` already exists and is already tested. Run it at insert time, persist score and reasons, and the database can finally sort by relevance.
- **Freshness.** `lastSeenAt` refreshed whenever a scrape re-encounters the posting; anything unseen for 21 days flags as likely closed rather than silently rotting.
- **Cross-source dedupe.** A normalised key of company + title + location groups syndicated copies into one card showing "also on Arbeitnow, Jobicy".
- **Server-side querying.** `jobs.getAll` gains status, source, remote, work type, minimum score, posted-after, free text, sort and a cursor. The browser stops holding the whole table.

```ts
// src/lib/db/schema.ts

jobStatusEnum = ["new","shortlisted","applying","applied","screening",
                 "interviewing","offer","rejected","ghosted","dismissed"]

jobs.status           job_status not null default 'new'
jobs.statusChangedAt  timestamp
jobs.appliedAt        timestamp
jobs.score            integer          // index (user_id, status, score desc)
jobs.scoreReasons     text[]
jobs.lastSeenAt       timestamp not null
jobs.dedupeKey        text             // index (user_id, dedupe_key)
jobs.notes            text
jobs.nextActionAt     timestamp        // follow-up reminders, same shape as leads

jobEvents  id · userId · jobId · kind · fromStatus · toStatus · body · createdAt
```

### Phase 2 — The triage workbench · ~3 days · **built**

This is the screen you will actually live in. Right now reviewing 200 jobs means 200 mouse
trips through a three-column card grid with no way to see the good ones first. The target
is: open the app, clear the overnight batch in four minutes, keyboard only.

- **Sorted by score, with the reasons visible.** "87 · matches react, typescript · posted 6 hours ago · salary listed". The number is already explainable by design — show the explanation.
- **Keyboard triage.** `j`/`k` move, `s` shortlist, `a` applied, `x` dismiss, `o` open the posting, `/` search, `Cmd+K` command palette. This alone is the difference between triage and chore.
- **A detail pane, not a card.** Full description, extracted requirements, other roles at the same company, your event history, every action in one place.
- **A dense list mode.** Cards are for browsing; a table is for triage. Toggle, remembered.
- **Dismiss with a reason.** wrong seniority · wrong stack · location · salary · company. Two lines of UI that later become training data for the matcher.
- **Mute rules.** Hide a company, an agency recruiter, or a title pattern permanently, instead of dismissing the same staffing firm forty times.
- **Bulk actions beyond delete.** Select twelve, shortlist them, move them to another bucket.
- **Saved views.** "Remote, score 70+, posted this week, not dismissed" as a named tab you open every morning.

Two departures from the list above, both deliberate:

- **No `Cmd+K` palette.** Everything it would have contained is either a single
  key already (`/`, `?`, `s`, `a`, `x`) or a link in the sidebar. A palette on top
  of that is a second way to do the same things, and a second thing to maintain.
- **Dismiss asks for a reason, but never costs more than one key.** `x` opens the
  prompt; a digit picks a reason, Enter skips it. Both paths are two keystrokes,
  so nobody is taxed for explaining themselves and nobody is stopped for not.

### Phase 3 — Make the AI do the work you're doing by hand · ~4 days · **built, bar one**

Today the AI writes a DM. The expensive parts of a job hunt are reading the description,
judging the fit, tailoring the CV, writing the letter and answering the form's four essay
questions. All of it is well within what a model does reliably, and all of it is absent.

- **Read the description once, structure it forever.** Extract seniority, years required, tech stack, a normalised salary *number*, remote policy, visa sponsorship, language. Suddenly "min salary" and "senior only" are real filters instead of a text match.
- **A fit report per job.** Requirement-by-requirement: met, partially met, missing. A headline percentage, an honest gap list, and the two things to emphasise if you apply. This is the feature people would pay for.
- **Cover letters.** A job-hunting app with no cover letter generator is the single strangest gap in the product.
- **Application answers.** "Why do you want to work here?", "Tell us about a challenge" — generated from the JD, your CV and your saved past answers. The biggest real time sink in applying, and nothing here touches it.
- **Tailored CV bullets.** Your existing bullets, rewritten toward this description, with the changes marked so you stay honest about them.
- **Interview prep pack.** Likely questions derived from the JD, plus a short company brief, generated when a job moves to *interviewing*.
- **Semantic matching.** `matchesQuery` is keyword-binary — it can't tell "React Developer" from "Frontend Engineer (React)". Embed the JD and your profile once each, cosine-rank, and hundreds of equal "matches" become a ranked thirty.
- **Per-account AI keys.** Same pattern as `source_credentials`, which already exists, is already encrypted, and already has UI. Do it before a second person logs in.

**Semantic matching is the one bullet not built.** It needs `CREATE EXTENSION vector`
on the Neon branch and an embeddings provider, plus a backfill over every stored job.
Neither can be verified from here — the same reason no migration in this plan has been
applied — and shipping unverifiable SQL against a live database is exactly the thing worth
not doing. Everything else in the phase is in. `matchesQuery` stays keyword-binary until
then; the fit report is what answers "is this actually for me" in the meantime, and it does
it better, because it reads the CV rather than counting words in it.

Two things worked out while building, both kept:

- **The fit report feeds the cover letter.** It has already decided which parts of this CV
  answer this description; making the letter re-derive that from scratch would be paying
  twice for the same reasoning and getting the worse answer the second time.
- **The model reports the salary and its period; the app does the multiplication.** A model
  that silently converts a monthly figure to annual is a model whose arithmetic you cannot
  check, and the number ends up in a filter.

### Phase 4 — Follow-through · ~2 days

Replies come from the second and third contact, not the first. Right now the app helps you
send one message and then forgets you exist.

- **Send where the person actually is.** `wa.me/<phone>?text=`, `mailto:` with the body pre-filled, LinkedIn compose. Marks sent on click.
- **A follow-up engine.** Sent with no reply in five days produces a follow-up draft in your queue, written with the knowledge that it's the second touch. Third at day twelve, then stop.
- **Threads.** All messages to one contact or about one job in sequence, so you can see what you already said before saying it again.
- **Templates you can edit.** Move the five prompts out of `lib/ai/client.ts` and into a table. Users tune their own voice; you stop shipping a deploy to change a sentence.
- **Controls at generation time.** Tone, length, formality and **language**. Arabic outreach currently depends on one incidental line inside the buyer prompt.
- **Three variants, pick one.** Cheap on free models, and dramatically better than accepting the first draft.

### Phase 5 — Automation you can trust · ~2 days

The landing page promises autopilot. Today that means one cron, at one time, running one
account-level search, ignoring every bucket you built, capped at sixty seconds.

- **Per-bucket schedules.** Each bucket runs on its own cadence and reports on its own digest. Fixes the defect where automation skips buckets entirely.
- **Scraping moves to the queue.** QStash is already wired for digest fan-out. Point `startScrape` at it and the 60-second cap disappears — all 21 sources in one run, with honest progress.
- **Instant alerts.** Score above your threshold sends a Telegram message within minutes. Early applicants win; a 6am daily summary is not the same product.
- **Actionable digests.** Shortlist and Dismiss as signed links in the email, so triage starts in the inbox and the app is already sorted when you open it.
- **Source health.** Last success per source, what returned nothing, canary results — on a page, not in a log. A source can currently break for weeks in silence.

### Phase 6 — Reach, intelligence and the parts you'd show someone · ~3 days

With the spine in place, these are all small — and this is where the second business hiding
in your data shows up almost for free.

- **Company view.** Jobs grouped by company: open roles, oldest posting, extracted stack, first and last seen. For a job hunt it's context. For the agency idea in `PRODUCT-DIRECTION.md` it *is* the product — a company with five open React roles has a confirmed need and an approved budget. One query and one page, no fork.
- **Auto-suggest tracked companies.** You scrape a Greenhouse job, so you already know the slug. Offer to track the company instead of making the user find it.
- **Add a job by URL.** Most jobs are found outside the app. Paste a link, parse it, file it. A bookmarklet makes it one click.
- **Outcome analytics.** The funnel — found → shortlisted → applied → replied → interviewed → offered — plus response rate by source, template and channel. The dashboard currently counts effort, which is the one number that can't tell you anything.
- **Export and import.** CSV and JSON out; bring existing applications in.
- **Onboarding.** A new account currently faces criteria, buckets, companies, sources and credentials with no order suggested. A five-step wizard ending in a first successful scrape.
- **Mobile triage.** Swipe right to shortlist, left to dismiss. Ten minutes of commute clears the overnight batch.
- **Private CVs.** Signed, expiring URLs behind auth.

### On the SaaS question

`PRODUCT-DIRECTION.md` argues for pointing this at agencies rather than job seekers, and the
business logic in it is sound — success is churn for a job-hunting tool. But it is the wrong
*first* move, because the agency product needs exactly the same spine: a scored list, a
triage surface, a pipeline with real states, and follow-ups.

Build phases 1–4 for your own hunt, where you are the user and the feedback loop is instant.
The company view in phase 6 then turns the same data into the agency product without a fork.
Don't choose yet — the choice is cheap to defer and expensive to make early.

---

## 5. This weekend — eight things worth doing immediately

Each is under a day, and each is visible the moment it ships. Three of them are just
connecting things you already built to the screen.

| # | Win | Why | Cost |
|---|---|---|---|
| 1 | **Show the score** | Run `scoreJob` on the jobs list, show the number and its reasons on the card, sort by it. The function is written and tested — it just isn't wired to the UI. | ~1 hour, no schema change |
| 2 | **Pass the bucket to the cron** | One argument in `runDailyDigestForUser`. Right now every bucket is invisible to your automation. | ~30 min, fixes a real defect |
| 3 | **Shortlist and Dismiss buttons** | Even before the full status enum, two booleans and two buttons turn the pile into a pile you're allowed to touch. | ~2 hours |
| 4 | **WhatsApp and mail links** | `wa.me` and `mailto:` on Ready to send. You already store the phone and the email. | ~30 min |
| 5 | **A job detail drawer** | Click a card, get the full description, the metadata and the actions without a card that grows to twice its neighbours. | ~3 hours |
| 6 | **Hide a company** | One filter, one array in settings. Kills the recurring staffing-agency noise permanently. | ~1 hour |
| 7 | **Move salary and work type onto buckets** | A bucket run currently drops your salary floor because it lives only on criteria. | ~2 hours |
| 8 | **Cover letter generation** | A sixth template, the same call path as the existing five, aimed at the document you actually need most. | ~2 hours |

---

## 6. What I'd deliberately not build

| | |
|---|---|
| **Repairing Find Managers** | The blocker is a logged-in LinkedIn session cookie, which this app is right to refuse. Money doesn't fix it, and phase 1 removes the need for it — the pipeline stops running through a person. |
| **Reddit as a source** | The adapter works, and switching it on breaks all three conditions of Reddit's Responsible Builder Policy — including one that's structural, since message generation forwards post bodies to a model provider. Leave it in the codebase, off. |
| **X at ~$100/month** | The worst yield per pound of anything on the list. Freelancer.com and HN cover the same ground for nothing. |
| **Automated email sending** | Needs a paid email-finding service, a warmed domain, and a lawful basis under GDPR. The manual copy-and-send flow is the correct answer until all three exist. |
| **A second app for the agency use case** | Same spine, same data, one extra view. Forking now doubles the maintenance and halves the attention while you're still the only user. |
| **More sources** | Twenty is already more than the triage surface can handle. Every new source makes the unranked pile worse. Fix ranking first; add sources when adding one is a net gain. |

---

## The one-line version

Today Einherji answers one question well: *what is out there?*

After phase 2 it answers the question that matters — *what should I do next, and in what
order?* — and after phase 3 it does a meaningful share of that work for you. The scraping
platform, which is the hard part and the part that's finished, stays exactly where it is.
What's missing is the twelve inches between a database of jobs and a person deciding what to
do about them.
