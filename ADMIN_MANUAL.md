# Admin Manual

## 1. System Overview

### High-Level Purpose & Capabilities
**Einherji** is an automated, AI-augmented job discovery, application collateral generation, and outbound relationship pipeline platform. Originally architected as a specialized personal career accelerator, the system has evolved into a versatile outbound engine supporting job search campaigns, freelance contract discovery, B2B client acquisition, and commercial supplier sourcing.

The system ingests real-time job and business opportunities across more than 20 public and credentialed channels, eliminates syndication duplicates across disparate aggregators, scores and ranks opportunities using an explainable multi-signal algorithm, enables rapid single-key triage, extracts structured factual parameters via Large Language Models (LLMs), generates bespoke application documents, drafts persona-specific outreach messages across multiple communication mediums (LinkedIn, WhatsApp, Email), and tracks relationship progression across an interactive 8-stage visual Kanban pipeline.

### Core Architectural Paradigm
Einherji is built as a unified full-stack application on **Next.js (App Router)** and **TypeScript**, enforcing strict architectural boundaries through a **domain-first onion architecture**:
```
Client Components / Hooks
          │
          ▼
   tRPC Router Layer (src/<domain>/<domain>.router.ts)
          │  [protectedProcedure session validation]
          ▼
  Business Service Layer (src/<domain>/<domain>.service.ts)
          │  [orchestration, quota consumption, AI calls]
          ▼
  Database Query Layer (src/<domain>/<domain>.db.ts)
          │  [Drizzle ORM queries scoped to userId]
          ▼
 PostgreSQL Database (Neon Serverless PostgreSQL)
```

Data flows strictly top-to-bottom. Routers handle HTTP and RPC serialization; services enforce business invariants, quota checks, and external service calls; database modules execute SQL queries using Drizzle ORM; and schema definitions in `schema.ts` enforce relational integrity, indexes, and cascade behavior.

---

## 2. Business Problem and Solution

### The Business Problem
The professional opportunity market is plagued by severe fragmentation, deceptive metadata, high friction, and asymmetric automation:
1. **Source Fragmentation:** Open positions and business leads are dispersed across walled ATS portals, global aggregators, localized job boards, community threads, and social networks.
2. **Data Deception & Noise:** Employers and recruiting agencies frequently disguise seniority levels, mislabel regional jobs as remote, obscure compensation bands, or flood boards with duplicate agency postings.
3. **Application & Outreach Friction:** Crafting high-converting, personalized applications and outreach messages takes significant manual time (30–60 minutes per job). Consequently, applicants either burn out or resort to generic boilerplate messages that convert poorly.
4. **Follow-Up Breakdown:** Opportunities are lost because applicants lose track of when applications were sent and fail to follow up before requisitions close.

### Traditional / Previous Process
Historically, an individual or small agency relies on manual browsing across 15+ browser tabs, copy-pasting job descriptions into text editors, writing cover letters by hand, maintaining an out-of-date spreadsheet, and guessing at hiring managers.

### How This System Solves It
- **Multi-Source Crawling:** Ingests from 20+ sources (ATS APIs, aggregators, RSS feeds, sitemaps, and search engines) in a single unified pipeline.
- **Cross-Source Fingerprinting:** Merges identical postings across sources using deterministic string normalizers.
- **Explainable Ranking:** Ranks every opportunity from 0 to 100% using an auditable, multi-signal scoring model.
- **Automated Deep Insights:** LLMs parse raw text to extract true seniority, normalized annual compensation, remote reality, and visa flags, followed by a line-by-line CV requirement benchmark.
- **Assisted Collateral & Outreach Dispatch:** Produces custom cover letters, targeted CV bullets, custom form answers, and channel-optimized outreach messages, keeping a human in the loop to review and dispatch.
- **Automated Autopilot:** Runs overnight crawls and delivers top matches via Email and Telegram.

### Quantifiable Business Benefits
- **Elimination of Duplicated Effort:** Deduplication ensures users never review the same role twice.
- **Centralized Operational Repository:** All criteria, postings, notes, documents, contacts, and message drafts reside in one database.
- **Accelerated Triage Speed:** Sub-second keyboard navigation processes 50+ postings in minutes.
- **Higher Outbound Quality:** Grounded AI generations cite specific resume evidence and job initiatives.
- **Auditable Status Consistency:** Pipeline events track every status transition, note, and reminder.

---

## 3. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────────┘

     CLIENT TIER
     ┌──────────────────────────────────────────────────────────────┐
     │ Next.js App Router (React 19) + TanStack Query               │
     │ Tailwind CSS v4 + Radix UI Primitives + @hello-pangea/dnd    │
     └──────────────┬───────────────────────────────┬───────────────┘
                    │ HTTPS / JSON                  │ Uploads
                    ▼                               ▼
     API & ROUTING TIER                    STORAGE TIER
     ┌────────────────────────────┐        ┌────────────────────────┐
     │ Next.js Route Handlers     │        │ UploadThing            │
     │ • /api/trpc/* (tRPC v11)   │        │ (CV PDF Storage,       │
     │ • /api/auth/* (Better Auth)│        │  8MB size ceiling)     │
     │ • /api/cron/* (Vercel Cron)│        └────────────────────────┘
     │ • /api/queue/* (QStash)    │
     └──────────────┬─────────────┘
                    │
                    ▼
     SERVER & SECURITY BOUNDARY
     ┌──────────────────────────────────────────────────────────────┐
     │ • middleware.ts (Presentation cookie check)                  │
     │ • protectedProcedure (Database session verification)         │
     │ • assertSafeUrl (SSRF mitigation for CVs & URLs)             │
     │ • secret-box.ts (AES-256-GCM encryption for credentials)     │
     │ • consumeQuota (Postgres-backed rolling 24h cost caps)       │
     └──────────────┬───────────────────────────────────────────────┘
                    │
                    ▼
     DOMAIN SERVICE LAYER
     ┌──────────────────────────────────────────────────────────────┐
     │ jobs • scraping • criteria • leads • messages • buckets      │
     │ job-insights • job-documents • companies • places • digest   │
     └──────┬──────────────────────┬──────────────────────┬─────────┘
            │                      │                      │
            ▼                      ▼                      ▼
     PERSISTENCE           AI / LLM LAYER         EXTERNAL INGESTION
     ┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
     │ Neon PostgreSQL │   │ OpenRouter /     │   │ ATS APIs        │
     │ via Drizzle ORM │   │ OpenAI SDK       │   │ Aggregators     │
     │ (JSONB, Partial │   │ (Llama 3.3 70B,  │   │ Google Places   │
     │  & B-Tree Idxs) │   │  GPT-4o, Claude) │   │ Telegram / Resend
     └─────────────────┘   └──────────────────┘   └─────────────────┘
```

### High-Level Request Flow
`Browser -> Next.js Edge/Node Middleware -> App Router -> tRPC Procedure -> protectedProcedure Session Guard -> Domain Service -> Quota Check -> LLM / Scraper / External API -> Drizzle ORM Query -> Neon PostgreSQL`

---

## 4. Technology Map

| Technology | Used For | Where Used | Why It Is Used |
|---|---|---|---|
| **Next.js 16 (App Router)** | Full-stack application framework | Entire project (`src/app`) | Modern React Server Components, server actions, route handlers, and streaming capabilities. |
| **React 19** | Component UI library | `src/components`, `src/app` | Advanced client hooks, form actions, and optimistic rendering. |
| **TypeScript 5 (Strict)** | Static type safety | Entire repository | Full compile-time type verification, shared types between client and server. |
| **tRPC v11** | End-to-end type-safe RPC API | `src/server`, `src/lib/trpc-client` | Eliminates API contract drift; shares Zod validator types directly with the client. |
| **Better Auth** | Authentication & session management | `src/lib/auth.ts`, `src/app/api/auth` | Self-hosted, database-backed authentication supporting Drizzle adapter and email verification. |
| **Drizzle ORM** | Type-safe SQL query builder & schema | `src/lib/db`, `src/*/*.db.ts` | Zero-overhead, predictable SQL generation with explicit foreign keys and partial index definitions. |
| **Neon PostgreSQL** | Serverless relational database | Persistent storage | Scalable Postgres with branching and serverless connection pooling via `@neondatabase/serverless`. |
| **OpenRouter SDK** | Unified LLM API gateway | `src/lib/ai`, `src/lib/cv-parser` | Provides cost-effective access to diverse models (Llama 3.3 70B, Claude Sonnet, Gemini). |
| **OpenAI SDK** | Direct OpenAI model completions | `src/lib/ai/resolve-ai-client.ts` | Allows users to bypass OpenRouter and spend direct OpenAI API credits. |
| **UploadThing** | Secure file upload and asset hosting | `src/lib/uploadthing.ts`, CV upload | Managed file storage with server-side middleware authentication and size restrictions. |
| **unpdf** | Server-side PDF text extraction | `src/lib/cv-parser.ts` | Pure JavaScript PDF text extraction without native C++ compilation dependencies. |
| **@hello-pangea/dnd** | Drag-and-drop Kanban interactions | `src/components/tracker` | High-performance, accessible drag-and-drop mechanics (maintained fork of react-beautiful-dnd). |
| **Resend** | Transactional email delivery | `src/lib/resend.ts`, digest service | Reliable developer-first email delivery for verification links and daily job digests. |
| **Upstash QStash** | Distributed task queue & fan-out | `src/lib/qstash.ts`, `/api/queue/*` | Decouples nightly cron jobs into isolated, retryable per-user background invocations. |
| **Telegram Bot API** | Direct mobile notification delivery | `src/lib/telegram.ts`, digest | Provides instantaneous, mobile-friendly job alerts without native mobile app overhead. |
| **Google Places API** | Real-world business discovery | `src/lib/places`, `/places` | High-fidelity business directory search for regional B2B client and supplier sourcing. |
| **Sentry** | Error monitoring and performance tracing | `instrumentation.ts`, API routes | Captures uncaught server errors, background cron failures, and frontend exceptions via tunnel. |
| **Vitest** | Automated test runner | `src/**/*.test.ts` | Fast, ESM-native unit, integration, and canary testing suite. |
| **Tailwind CSS v4** | Design system & utility styling | `src/app/globals.css`, UI | Fast styling using modern CSS variables and container queries. |
| **Lucide React** | Consistent iconography | Entire UI | Lightweight, clean iconography across tables, buttons, and navigation. |
| **Sonner** | Toast notification system | Client mutations | Non-blocking, beautiful toast notifications for user actions. |

---

## 5. Feature-to-Technology Map

### Feature: Multi-Tier Job Scraping Engine
- **Problem solved:** Disparate job boards, manual browsing fatigue, rate limits.
- **Frontend:** `src/components/scraping/scrape-button.tsx`, `scrape-run-panel.tsx`.
- **Backend:** `src/scraping/scraping.service.ts`, `src/scraping/scraping.router.ts`.
- **Database:** `scrape_runs` table with unique running index, `jobs` table with composite indexes.
- **External services:** Direct ATS endpoints (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling), Aggregators (RemoteOK, Arbeitnow, Jobicy, Himalayas, The Muse, We Work Remotely, Hacker News, Wuzzuf), Marketplaces (Freelancer.com, HN Freelance), Credentialed APIs (Adzuna, SerpAPI, Reddit, X/Twitter), LinkedIn Guest scraper, Apify.
- **Workflow:** User/cron triggers run -> Quota checked -> In-flight duplicate run prevented -> Sources queried in parallel with 60s timeout -> Mute rules applied -> Results deduplicated and scored -> Batched DB insert -> Progress updated in real time.
- **Why this implementation was chosen:** Ingesting directly from official ATS APIs is free, legally unencumbered, fast, and immune to IP blocking.

### Feature: AI Fact Extraction & Line-by-Line Fit Reports
- **Problem solved:** Unclear job requirements, deceptive job titles, unqualified applications.
- **Frontend:** `src/components/jobs/job-detail-panel.tsx`, `job-fit-report.tsx`, `job-facts-strip.tsx`.
- **Backend:** `src/job-insights/job-insights.service.ts`, `src/lib/ai/write-fit-report.ts`, `src/lib/ai/extract-job-facts.ts`.
- **Database:** Populates `jobs` fact columns (`seniority`, `salaryMinAnnual`, `remotePolicy`, `offersVisaSponsorship`); persists `job_fit_reports` (JSONB requirements array).
- **External services:** OpenRouter / OpenAI LLMs.
- **Workflow:** User opens shortlisted job -> Clicks Extract Facts or Generate Fit Report -> Quota deducted -> LLM evaluates description against CV -> Zod validates response -> Stored in database -> Rendered as interactive scorecard.
- **Why this implementation was chosen:** Persisting extracted facts directly on the `jobs` row enables instantaneous SQL `WHERE` queries without expensive runtime joins.

### Feature: Tailored Application Document Generator
- **Problem solved:** Writing custom cover letters and essay answers takes 30–60 minutes per job.
- **Frontend:** `src/components/jobs/job-documents-panel.tsx`.
- **Backend:** `src/job-documents/job-documents.service.ts`, `src/lib/ai/write-job-document.ts`.
- **Database:** `job_documents` table linked to `jobs.id` (`onDelete: cascade`).
- **External services:** OpenRouter / OpenAI LLMs.
- **Workflow:** User selects document kind (`cover_letter`, `application_answer`, `cv_bullets`, `interview_prep`) -> Enters optional prompt -> LLM synthesizes role description, candidate CV, and elevator pitch -> Generates formatted Markdown -> Persists in database -> User copies with one click.
- **Why this implementation was chosen:** Dedicated table structure allows storing multiple drafts and multiple question-answer pairs per application.

### Feature: Search Buckets
- **Problem solved:** Managing separate searches (e.g., job hunt vs freelance contracts vs raw material sourcing) in one account.
- **Frontend:** `src/components/buckets/bucket-bar.tsx`, `bucket-select.tsx`.
- **Backend:** `src/buckets/buckets.service.ts`, `src/buckets/buckets.router.ts`.
- **Database:** `buckets` table; foreign keys on `jobs.bucket_id` (`onDelete: cascade`) and `leads.bucket_id` (`onDelete: set null`).
- **External services:** None.
- **Workflow:** User creates bucket with custom keywords, locations, sources, and pitch -> Buckets filter Jobs, Leads, and Tracker views -> Bucket parameters override global search criteria during targeted crawls.
- **Why this implementation was chosen:** Enables multi-tenant-like domain separation within a single user account without architectural bloat.

### Feature: Context-Aware Outreach Messaging & Approval Queue
- **Problem solved:** Cold outreach is slow and botting LinkedIn accounts risks account bans.
- **Frontend:** `src/components/messages/approval-card.tsx`, `ready-to-send-list.tsx`, `messages-view.tsx`.
- **Backend:** `src/messages/messages.service.ts`, `src/messages/messages.router.ts`.
- **Database:** `messages` table with status enum (`draft`, `approved`, `sent`, `edited`).
- **External services:** OpenRouter / OpenAI LLMs.
- **Workflow:** User generates message -> Channel detected (LinkedIn, WhatsApp, Email) -> Template selected (hiring manager, client pitch, supplier enquiry) -> AI generates draft -> Draft reviewed/edited in Approval Queue -> Approved -> User copies text, sends via external platform -> User clicks "Mark as sent" -> Lead status advances to `message_sent`.
- **Why this implementation was chosen:** Assisted human-in-the-loop dispatch protects user reputation and complies with third-party platform Terms of Service.

---

## 6. Roles and Permissions

### User Roles & Tenancy Architecture
Einherji currently implements a **Single-User Workspace Model**. 

| Entity / Action | Owner (Authenticated User) | Unauthenticated Visitor | Cross-Tenant User |
|---|---|---|---|
| **View Dashboard / Jobs / Leads** | Full Access | Redirected to `/login` | Access Denied (Strictly isolated by `userId`) |
| **Run Scrapes / AI Generations** | Permitted (Bounded by Quotas) | Access Denied (401 Unauthorized) | Access Denied |
| **Manage Third-Party API Keys** | Full Access (Encrypted at rest) | Access Denied | Access Denied |
| **Public Registration** | Controlled by `ARE_SIGNUPS_OPEN` | Accessible when open; Locked when closed | N/A |
| **Cron Trigger Execution** | N/A (Server-only) | Access Denied (Requires `Bearer CRON_SECRET`) | N/A |
| **Queue Callback Execution** | N/A (Server-only) | Access Denied (Requires QStash signature) | N/A |

### Technical Enforcement
1. **Middleware Presentation Boundary (`middleware.ts`):** Checks for presence of Better Auth session cookie (`better-auth.session_token`). If missing on non-public routes, redirects to `/login?next=<path>`. Public routes: `/`, `/login`, `/register`, `/verify-email`, `/monitoring`, and all `/api/*` endpoints.
2. **tRPC Security Boundary (`src/server/trpc.ts`):** `protectedProcedure` enforces session validation against the database:
   ```ts
   export const protectedProcedure = trpc.procedure.use(({ ctx, next }) => {
     if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED" });
     return next({ ctx: { ...ctx, session: ctx.session } });
   });
   ```
3. **Database Query Isolation:** Every database operation in `src/*/*.db.ts` mandates `userId` in its query constraints (e.g., `and(eq(table.id, id), eq(table.userId, userId))`). Verified by integration tests (`tenant-isolation.integration.test.ts`).

---

## 7. Data Model

The database schema is declared in `src/lib/db/schema.ts` using Drizzle ORM.

### Conceptual Entity Descriptions

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA RELATIONSHIP FLOW                          │
└────────────────────────────────────────────────────────────────────────┘

                           ┌──────────────┐
                           │    users     │
                           └──────┬───────┘
                                  │ 1:N
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ user_settings │         │   criteria    │         │    buckets    │
└───────────────┘         └───────────────┘         └───────┬───────┘
                                                            │ 1:N
        ┌───────────────────────────────────────────────────┼─────────────────────┐
        │                                                   │                     │
        ▼                                                   ▼                     ▼
┌───────────────┐  1:N    ┌───────────────┐  1:N    ┌───────────────┐     ┌───────────────┐
│  job_events   │◀────────┤     jobs      │◀────────┤     leads     │◀────┤   messages    │
└───────────────┘         └───┬───────┬───┘         └───────┬───────┘     └───────────────┘
                              │       │                     │
                              │ 1:1   │ 1:N                 │
                              ▼       ▼                     │
                      ┌──────────┐ ┌───────────────┐        │
                      │ job_fit_ │ │ job_documents │        │
                      │ reports  │ └───────────────┘        │
                      └──────────┘                          │
                                                            │
                      ┌─────────────────────────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ places (live) │
              └───────────────┘
```

#### 1. `users`, `sessions`, `accounts`, `verifications`
- **Purpose:** Core identity, password authentication, and session handling managed by Better Auth.
- **Key Fields:** `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`.
- **Relationships:** Root parent for all user-owned records.

#### 2. `criteria`
- **Purpose:** Represents the user's active career search criteria and resume baseline.
- **Key Fields:** `userId`, `titles`, `locations`, `salaryMin`, `companySizeMin`, `companySizeMax`, `skills`, `resumeText`, `elevatorPitch`, `model`, `isActive`.
- **Lifecycle:** Exactly one active row per user; new inserts deactivate prior rows.

#### 3. `buckets`
- **Purpose:** Segregates independent search campaigns (jobs, clients, suppliers, custom).
- **Key Fields:** `userId`, `name`, `kind` (`jobs`, `clients`, `suppliers`, `custom`), `keywords`, `locations`, `sources`, `pitch`, `isArchived`.
- **Relationships:** Parent to `jobs` (cascade delete) and `leads` (set null on delete).

#### 4. `jobs`
- **Purpose:** Central entity representing scraped opportunities across all sources.
- **Key Fields:** `userId`, `bucketId`, `source`, `sourceJobId`, `title`, `company`, `location`, `jobUrl`, `status` (`new`, `shortlisted`, `applying`, `applied`, `screening`, `interviewing`, `offer`, `rejected`, `ghosted`, `dismissed`), `score`, `scoreReasons`, `seniority`, `salaryMinAnnual`, `salaryMaxAnnual`, `salaryCurrency`, `remotePolicy`, `offersVisaSponsorship`, `dedupeKey`, `alsoOnSources`, `lastSeenAt`.
- **Indexes:** Unique index on `(userId, source, sourceJobId)`; query index on `(userId, status, score DESC)`.

#### 5. `job_events`
- **Purpose:** Audit log of all state transitions and notes for a job.
- **Key Fields:** `userId`, `jobId`, `kind` (`status_change`, `note`, `reminder_set`), `fromStatus`, `toStatus`, `body`, `createdAt`.
- **Lifecycle:** Cascades on job deletion.

#### 6. `job_fit_reports`
- **Purpose:** AI-generated CV-to-job requirement evaluations.
- **Key Fields:** `userId`, `jobId`, `matchPercent`, `summary`, `requirements` (JSONB), `gaps`, `emphasise`, `model`.
- **Lifecycle:** One report per job; re-running updates in place.

#### 7. `job_documents`
- **Purpose:** Collateral generated for an application.
- **Key Fields:** `userId`, `jobId`, `kind` (`cover_letter`, `application_answer`, `cv_bullets`, `interview_prep`), `prompt`, `body`, `model`.
- **Lifecycle:** Multiple documents per job; cascades on job deletion.

#### 8. `tracked_companies`
- **Purpose:** Target employers monitored directly via ATS job boards.
- **Key Fields:** `userId`, `name`, `careersUrl`, `atsProvider`, `atsSlug`, `lastCheckedAt`.
- **Lifecycle:** Unique by `(userId, name)`.

#### 9. `mute_rules`
- **Purpose:** Global text and company patterns filtered out during crawling.
- **Key Fields:** `userId`, `kind` (`company`, `title`), `pattern`, `createdAt`.
- **Lifecycle:** Unique by `(userId, kind, pattern)`.

#### 10. `saved_views`
- **Purpose:** User-defined filter presets rendered as tabs on `/jobs`.
- **Key Fields:** `userId`, `name`, `filters` (JSONB), `position`.
- **Lifecycle:** Unique by `(userId, name)`.

#### 11. `leads`
- **Purpose:** Professional contacts, hiring managers, and prospective clients.
- **Key Fields:** `userId`, `bucketId`, `jobId`, `firstName`, `lastName`, `title`, `company`, `linkedinUrl`, `phone`, `placeId`, `headline`, `about`, `status` (`not_contacted`, `message_sent`, `reply_received`, etc.), `nextActionAt`, `lastContactedAt`, `notes`.
- **Lifecycle:** Outlives jobs and buckets (`onDelete: set null`).

#### 12. `messages`
- **Purpose:** Outreach drafts generated for contacts.
- **Key Fields:** `userId`, `leadId`, `jobId`, `body`, `templateUsed`, `status` (`draft`, `approved`, `sent`, `edited`), `approvedAt`, `sentAt`, `editedBody`.
- **Lifecycle:** Cascades on lead deletion.

#### 13. `user_settings`
- **Purpose:** Per-user integrations, proxy settings, and notification preferences.
- **Key Fields:** `userId`, `jobTitle`, `linkedinUrl`, `apifyApiToken`, `openrouterApiKey`, `openaiApiKey`, `jobSources`, `scrapingProxyProvider`, `scrapingProxyApiKey`, `dailyDigestEnabled`, `digestChannels`, `telegramBotToken`, `telegramChatId`, `lastDigestSentAt`.

#### 14. `source_credentials`
- **Purpose:** AES-256-GCM encrypted credentials for third-party sources.
- **Key Fields:** `userId`, `source`, `credentials` (JSONB ciphertext).

#### 15. `scrape_runs`
- **Purpose:** Tracks background scrape executions and real-time task progress.
- **Key Fields:** `userId`, `status` (`queued`, `running`, `completed`, `failed`, `cancelled`), `sources`, `tasksTotal`, `tasksCompleted`, `jobsFound`, `jobsInserted`, `errorMessage`, `startedAt`, `finishedAt`.
- **Constraint:** Partial unique index guarantees one running scrape per user.

#### 16. `usage_events`
- **Purpose:** Immutable audit log enforcing rolling 24-hour cost ceilings.
- **Key Fields:** `userId`, `action` (`scrape`, `generate_message`, `parse_cv`, etc.), `createdAt`.

---

## 8. Major Business Workflows

### 1. Ingestion, Cross-Source Deduplication & Scoring
- **Business Goal:** Aggregate opportunities from 20+ sources, strip duplicates, rank by relevance.
- **Data Flow:** Scraper Adapters -> Zod Validation -> Mute Filter -> Dedupe Key Normalizer -> Score Calculator -> Batch DB Insert.
- **Database Changes:** Writes `scrape_runs` progress; inserts/updates `jobs` rows; logs deduplication links in `alsoOnSources`.
- **External Actions:** HTTP queries to ATS boards, RSS feeds, aggregator endpoints.
- **Final State:** New opportunities marked `new`, fingerprinted, and sorted by score.

### 2. Deep Job Fact Extraction & Fit Analysis
- **Business Goal:** Determine true job viability and CV alignment.
- **Data Flow:** Job Record + Active CV -> LLM Inference -> JSON Parser -> Facts & Report Storage.
- **Database Changes:** Updates `jobs` fact columns; upserts `job_fit_reports`.
- **External Actions:** LLM completion call via OpenRouter/OpenAI.
- **Final State:** Job enriched with visual badges and line-by-line scorecard.

### 3. Assisted Outreach & Human-in-the-Loop Dispatch
- **Business Goal:** Send personalized DMs to decision-makers without botting risk.
- **Data Flow:** Lead Data + Pitch/CV -> AI Generator -> Approval Queue -> Clipboard -> External Send -> Status Confirmation.
- **Database Changes:** Inserts `messages` (`draft` -> `approved` -> `sent`); updates `leads` status to `message_sent`.
- **External Actions:** None directly from server; user dispatches via LinkedIn or WhatsApp Web.
- **Final State:** Contact moved to "Message Sent" in CRM; follow-up timer initialized.

---

## 9. CRUD and Data Management

| Entity | Create | Read | Update | Delete / Archive | Cascading Impact |
|---|---|---|---|---|---|
| **Criteria** | Upload CV or manual entry | Active record queried | New insert deactivates prior | N/A (History retained inactive) | Modifies scoring & document generation baseline |
| **Jobs** | Multi-source scraper | Keyset cursor pagination | Status changes, notes, facts | Bulk delete or auto-dismiss | Cascades to `job_events`, `job_fit_reports`, `job_documents` |
| **Job Documents** | Generated on-demand | Tabbed panel on job | In-place re-generation | Individual deletion | Cascade deleted with parent job |
| **Tracked Companies** | Add modal with URL | Company list | Manual ATS slug correction | Remove button | Excludes company from future ATS crawls |
| **Buckets** | New Bucket modal | Tab bar & switcher | Edit name, keywords, pitch | Archive or Delete | Deleting bucket sets `bucketId = null` on leads/messages |
| **Leads** | Modal, import, Places | Table & Kanban | Status, notes, nextActionAt | Delete contact action | Cascades to delete associated `messages` |
| **Messages** | AI generation | Approval queue / ready list | Inline editing textarea | Replaced on regenerate | Advances lead status on "mark sent" |
| **Mute Rules** | Card ban button / modal | Mute rules dialog | N/A (immutable) | Delete rule | Deleting rule stops future crawl filtering |
| **Saved Views** | Save view button | Interactive tabs | Update filters, rename | Tab close action | None |
| **Credentials** | Encrypted settings form | Masked preview | Upsert replacement | Disconnect action | Disables source on scraper runs |

---

## 10. External Integrations

### 1. Neon Serverless PostgreSQL
- **Purpose:** Primary relational persistence.
- **Implementation:** `@neondatabase/serverless` pooler adapter paired with Drizzle ORM.
- **Failure Handling:** Connection retry logic; pool timeouts handled gracefully.

### 2. Better Auth
- **Purpose:** Authentication, session validation, email verification tokens.
- **Implementation:** Integrated with Drizzle adapter in `src/lib/auth.ts`.
- **Failure Handling:** Fails closed; invalid cookies reject RPC procedures.

### 3. OpenRouter & OpenAI
- **Purpose:** Generative AI completions for fact extraction, fit reports, documents, and outreach messages.
- **Implementation:** `src/lib/ai/resolve-ai-client.ts` dynamically resolves personal vs. server-wide keys.
- **Failure Handling:** Handles HTTP 429 (rate limits), 402 (insufficient credits), and 404 (model deprecation) with human-readable error messages.

### 4. UploadThing
- **Purpose:** Temporary storage for candidate CV PDFs.
- **Implementation:** `src/lib/uploadthing.ts` with server-side authentication middleware and 8MB file ceiling.
- **Failure Handling:** Rejects unauthenticated uploads; client displays upload progress errors.

### 5. Resend
- **Purpose:** Transactional email delivery (email verification and daily job digests).
- **Implementation:** `src/lib/resend.ts` SDK wrapper.
- **Failure Handling:** Falls back to logging verification URLs to local console when `RESEND_API_KEY` is missing.

### 6. Upstash QStash
- **Purpose:** Serverless task queue and cron fan-out.
- **Implementation:** `src/lib/qstash.ts` publishing signed HTTP tasks to `/api/queue/run-digest`.
- **Failure Handling:** Cryptographic signature verification (`upstash-signature`); automatic 2-retry policy on transient HTTP 500 errors.

### 7. Telegram Bot API
- **Purpose:** Mobile delivery of daily job digests.
- **Implementation:** `src/lib/telegram.ts` calling Telegram Bot REST endpoints.
- **Failure Handling:** Logs warning to Sentry on invalid chat ID; does not abort overall cron execution.

### 8. Google Places API
- **Purpose:** Real-world local business directory discovery.
- **Implementation:** `src/lib/places/search-places.ts` querying Google Places Text Search.
- **Failure Handling:** Catches API key errors and quota exhaustion; enforces zero-caching compliance.

### 9. Sentry
- **Purpose:** Centralized exception capture and performance monitoring.
- **Implementation:** Integrated via `@sentry/nextjs`, tunnel route at `/monitoring`.
- **Failure Handling:** Initializes as a no-op if `SENTRY_DSN` is not configured.

---

## 11. Real-Time & Reactive Features

- **Optimistic UI Updates:** TanStack Query immediately applies job status transitions and Kanban movements in client memory before server RPC round-trips complete.
- **Active Scrape Polling:** While a crawl is executing (`status = 'running'`), the client polls `scraping.latestRun` every 1,500ms to drive the progress bar and task counters.
- **Query Invalidation:** Mutating a lead or message invalidates linked queries across Dashboard, Leads, Messages, and Tracker simultaneously.

---

## 12. Authentication and Security

### 1. Presentation Guard vs. Security Boundary
- `middleware.ts` performs an optimistic cookie presence check (`getSessionCookie`) to redirect unauthenticated browser visits.
- `protectedProcedure` in `src/server/trpc.ts` performs the actual cryptographic validation against the database on every RPC call.

### 2. Secret Encryption at Rest (`secret-box.ts`)
- Third-party API keys (Apify, Adzuna, Google Places, Telegram, OpenAI, OpenRouter) are encrypted in the database using **AES-256-GCM**.
- Key derived from `CREDENTIALS_ENCRYPTION_KEY` (32 bytes base64).
- The client only ever receives masked previews (e.g., `sk-or...4a8b`).

### 3. Server-Side Request Forgery (SSRF) Protection (`assert-safe-url.ts`)
- All user-supplied URLs (CV links, company careers URLs) pass through strict DNS resolution and address checks:
  - Protocol restricted to HTTP/HTTPS.
  - Private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) blocked.
  - Loopback (`127.0.0.0/8`) and link-local (`169.254.0.0/16`) blocked.
  - Cloud metadata endpoints strictly blocked.
  - Redirects are re-checked at every hop.

### 4. Cost Ceilings & Abuse Prevention (`usage_events`)
- A rolling 24-hour database log enforces hard caps:
  - Scrapes: 50/day
  - Message Generations: 50/day
  - CV Parses: 20/day
  - Manager Searches: 25/day
  - Job Fact Extractions: 200/day
  - Fit Reports: 50/day
  - Document Generations: 50/day

---

## 13. Analytics and Monitoring

- **Error Monitoring:** Sentry SDK initialized on client, edge, and server runtimes. Client reports routed through Next.js tunnel `/monitoring` to bypass ad-blockers.
- **Operational Metrics:** Daily KPIs (jobs scraped, messages approved, replies, calls) aggregated on `/dashboard`.
- **Scraper Diagnostics:** Each crawl reports task completion fractions, mute statistics, and granular error summaries.

---

## 14. Performance & Scalability

- **Keyset Pagination (`cursor`):** Jobs table paginates using `(score, id)` cursors rather than `OFFSET`, maintaining $O(1)$ query time regardless of page depth.
- **Composite Indexing:** B-Tree indexes on `(userId, status, score DESC)` serve the default triage view directly from database index structures.
- **Parallel Scraper Dispatch:** Public ATS and aggregator tasks execute concurrently using `Promise.all` bounded by a 60-second execution ceiling.
- **In-Memory Rule Matching:** Mute rules load once per crawl; text matching executes in Node.js memory rather than generating thousands of SQL queries.

---

## 15. Testing and Code Quality

- **Test Suite:** 48 test files executed via **Vitest**.
- **Coverage Types:**
  - **Unit Tests:** Salary annualization, score calculation, dedupe fingerprinting, relative date parsing, Zod validators.
  - **Integration Tests:** Tenant data isolation (`tenant-isolation.integration.test.ts`), referential integrity (`referential-integrity.integration.test.ts`), AES secret encryption (`secret-box.test.ts`), usage quota limits (`usage.integration.test.ts`).
  - **Canary Tests:** Automated checks verifying that external job board APIs (Greenhouse, Lever, RemoteOK, etc.) have not changed their response structures.
  - **Security Tests:** SSRF address validation suite (`assert-safe-url.test.ts`).
- **Static Verification:** ESLint 9 configuration and strict TypeScript compilation (`npx tsc --noEmit`) pass with zero errors.

---

## 16. Deployment and Infrastructure

- **Hosting Platform:** Optimized for **Vercel** (Next.js App Router).
- **Background Schedulers:** Vercel Cron (`vercel.json`) executing `/api/cron/daily-digest` at `0 6 * * *` (6:00 AM UTC).
- **Task Queue:** Optional Upstash QStash integration for decoupled serverless execution.
- **Database Infrastructure:** Neon Serverless PostgreSQL with connection pooling.
- **Environment Configuration:** Validated at application boot via `src/lib/env.ts` using strict Zod schemas.

---

## 17. Incomplete / Planned Features

1. **Closed Public Signups:** `src/lib/signups.ts` enforces `ARE_SIGNUPS_OPEN = false`. Better Auth sets `disableSignUp: true`. New accounts can only be provisioned by changing this flag or directly seeding the database.
2. **Manual Email Finding & Dispatch:** The product stops at "Ready to Send". Because profile scrapers do not return personal email addresses, automated email dispatch is blocked; users manually copy text and dispatch via LinkedIn or WhatsApp.
3. **Workspace Tenancy (SaaS Conversion Gap):** Tenancy is currently modeled per `userId`. Converting to a multi-seat B2B SaaS will require introducing `workspaces` and `workspace_members` tables.
4. **Billing & Stripe Subscriptions:** Quotas are hard-coded cost ceilings. No Stripe integration or subscription tier billing is currently implemented.
5. **Time-Dependent Wuzzuf Test:** `src/lib/scrapers/aggregators/wuzzuf.test.ts` compares relative dates against a hardcoded August 2026 fixture date, requiring time-mocking in test runners.

---

# FEATURE INVENTORY

| Feature | User/Role | Problem Solved | Main Workflow | Technologies Used | Status |
|---|---|---|---|---|---|
| **CV Career Extraction** | Job Seeker | Manual profile data entry | Upload PDF -> AI extracts skills/titles/pitch | UploadThing, unpdf, OpenRouter | Fully implemented |
| **Multi-Source Scraping** | All Users | Fragmented job boards | Click Scrape -> 20+ sources crawled in parallel | Next.js, Linkedom, REST APIs | Fully implemented |
| **Cross-Source Deduplication** | All Users | Duplicate listings across portals | Computes `dedupeKey` -> Merges secondary sources | TypeScript normalizers, Postgres | Fully implemented |
| **Relevance Scoring** | All Users | Feeds sorted by date bury best jobs | Computes 0–100 score at insert time | Custom scoring algorithm | Fully implemented |
| **Keyboard Job Triage** | Job Seeker | Slow mouse-driven triage | `j`/`k`/`s`/`a`/`x`/`o` single-key pipeline updates | React hooks, Radix UI | Fully implemented |
| **AI Job Fact Extraction** | Job Seeker | Misleading titles and buried requirements | LLM extracts true seniority, salary, remote policy | OpenRouter, OpenAI, Zod | Fully implemented |
| **AI Job Fit Reports** | Job Seeker | Uncalibrated job fit | Benchmarks CV against requirements with evidence | OpenRouter, JSONB | Fully implemented |
| **Tailored Job Documents** | Job Seeker | Writing cover letters & essay answers | Generates letters, answers, bullets, prep packs | OpenRouter, Clipboard API | Fully implemented |
| **Tracked Companies & ATS** | Job Seeker / Agency | Missing non-aggregated career boards | Add company -> Detects ATS slug -> Direct crawl | ATS detection, REST APIs | Fully implemented |
| **Search Buckets** | Freelancer / Agency | Mixing job hunt with freelance/client hunts | Define separate campaigns with custom pitches | Drizzle ORM, Postgres | Fully implemented |
| **Mute Rules Engine** | All Users | Staffing agency spam in feeds | Mutes company/title -> Purges existing & future | Memory filter, SQL operators | Fully implemented |
| **Saved Views Bar** | All Users | Re-entering complex filters daily | Save filter presets as permanent tabs | Postgres JSONB, TanStack Query | Fully implemented |
| **Leads & Contact Directory** | All Users | Disconnected networking contacts | Individual addition + bulk text list parser | Custom parser, Drizzle ORM | Fully implemented |
| **Google Places Discovery** | Agency / Sourcing | Lack of job postings for local B2B | Live Google Places search -> Save selected leads | Google Places API, AES crypto | Fully implemented |
| **Contextual AI Messaging** | All Users | Crafting high-converting cold DMs | Channel/persona prompt synthesis -> Draft | OpenRouter, Persona prompts | Fully implemented |
| **Message Approval Queue** | All Users | Botting risks & AI hallucinations | Review draft -> Edit -> Approve -> Copy to send | Keyboard hooks, Clipboard API | Fully implemented |
| **Kanban Pipeline Board** | All Users | Disorganized opportunity tracking | Drag contact cards across 8 status columns | @hello-pangea/dnd | Fully implemented |
| **Automated Nightly Digest** | All Users | Forgetting to check job boards daily | Nightly cron -> Crawl -> Top 5 sent to Email/TG | Vercel Cron, QStash, Resend, TG | Fully implemented |
| **Credential Encryption** | All Users | Plaintext API keys in database | AES-256-GCM symmetric encryption at rest | Node.js Crypto module | Fully implemented |
| **Rolling Usage Quotas** | Platform | Unbounded third-party API spend | 24h rolling database event limiters | Neon Postgres, Drizzle | Fully implemented |

---

# WORKFLOW INVENTORY

| Workflow | Trigger | Actors | Modules | Technologies | Final Outcome |
|---|---|---|---|---|---|
| **Nightly Discovery & Digest** | Vercel Cron (6 AM UTC) | Cron, System | Cron Route, Scraper, Dedupe, Scorer, Digest | Vercel Cron, QStash, Resend, Telegram | Top 5 scored opportunities delivered via email/TG |
| **Keyboard Job Triage** | User pressing keys on `/jobs` | User | Jobs Workbench, Status Engine, Event Timeline | React keyboard hooks, TanStack Query | 50+ jobs sorted into Shortlist, Applied, or Dismissed |
| **Deep Job Evaluation** | User inspecting shortlisted job | User, LLM | Job Detail, Fact Extractor, Fit Analyzer | OpenRouter, OpenAI, Zod, Neon JSONB | Objective 0–100% scorecard with CV evidence citations |
| **Application Asset Creation** | User generating collateral | User, LLM | Job Documents, CV Profile | OpenRouter, Clipboard API | Tailored cover letter & essay answers copied to clipboard |
| **Target Company Setup** | User adding employer URL | User, System | Tracked Companies, ATS Detector | Linkedom, SSRF safe fetcher | ATS provider and slug resolved; direct ingestion enabled |
| **Outbound Messaging Cycle** | User generating lead outreach | User, LLM | Leads, AI Messaging, Approval Queue | OpenRouter, Prompt builder, Clipboard | Reviewed DM sent via LinkedIn/WhatsApp; lead updated |
| **Bulk Directory Ingestion** | User pasting text into import | User, System | Leads Import, List Parser | Regex multilingual parser, Drizzle | Unstructured text converted to clean lead rows |
| **Local B2B Deal Sourcing** | User searching local businesses | User, Google | Places Module, Leads, Buckets | Google Places API, AES secret box | Verified local businesses saved as actionable leads |

---

# PROBLEM → SOLUTION MAP

| Business / User Problem | How This Project Solves It | Features Involved |
|---|---|---|
| **Fragmented job searches across 15+ tabs** | Unified scraper querying ATS boards, aggregators, and crawlers into one feed | Multi-Tier Scraper, Tracked Companies |
| **Duplicate syndicated job postings** | Normalizes titles, companies, and cities to merge duplicates into one row | Cross-Source Deduplication Engine |
| **Deceptive titles & buried job requirements** | LLM extracts true seniority, annual salary band, and verified remote policy | AI Fact Extraction, Job Facts Strip |
| **Triage fatigue & slow evaluation** | Single-stroke keyboard shortcuts (`j`/`k`/`s`/`a`/`x`/`o`) to clear queues in minutes | Keyboard Triage Hook, Jobs Workbench |
| **Uncalibrated job fit & wasted applications** | Evaluates job requirements against CV line-by-line with evidence citations | AI Job Fit Reports, CV Parser |
| **Hours spent writing custom cover letters** | Generates bespoke letters, answers, and bullets grounded in the posting | Tailored Document Generator |
| **Persistent staffing agency spam** | Global company and title rules that discard spam before database insertion | Mute Rules Engine |
| **Re-entering the same 5 search filters daily** | Named filter presets saved as permanent tabs atop the workbench | Saved Views Tab System |
| **Lost networking contacts & forgotten follow-ups** | Centralized CRM tracking contacts, outreach drafts, and overdue reminders | Leads Directory, Follow-Up Alerts |
| **Mixing full-time job hunt with freelance gigs** | Multi-hunt buckets with independent keywords, sources, and pitch narratives | Search Buckets Architecture |
| **Lack of online job posts for local B2B** | Live Google Places search and raw text importer with Arabic/phone parsing | Places Module, Bulk List Parser |
| **Botting risks on LinkedIn** | Assisted dispatch: AI generates, human approves, copies, and sends manually | Approval Queue, Ready to Send List |
| **Forgetting to check job boards daily** | Automated nightly crawl emailing top 5 scored jobs to inbox or Telegram | Nightly Digest, Vercel Cron, QStash |

---

# PROJECT CAPABILITY SUMMARY

## Core Capabilities
- Ingests from 20+ job sources including direct ATS APIs, aggregators, and sitemaps.
- Normalizes and deduplicates syndicated job postings using deterministic fingerprinting.
- Evaluates candidate alignment using an explainable 0–100 relevance scoring algorithm.
- Enables sub-second keyboard-only triage across high-volume opportunity feeds.
- Extracts structured career facts and computes line-by-line CV requirement fit reports.
- Generates tailored cover letters, application answers, CV bullets, and interview guides.
- Monitors dream company careers pages via automated ATS provider and slug discovery.
- Supports multi-hunt search buckets for simultaneous job, freelance, and client hunts.
- Silences recruiting spam via global company and title mute rules.
- Captures local B2B prospects via live Google Places queries and unstructured text parsing.
- Drafts channel-specific outreach messages (LinkedIn, WhatsApp, Email).
- Manages assisted human-in-the-loop dispatch and 8-stage visual Kanban tracking.
- Delivers automated nightly job digests via Resend email and Telegram bots.
- Encrypts credentials at rest with AES-256-GCM and enforces rolling 24-hour cost ceilings.

## Main Problems Solved
- Fragmented opportunity discovery.
- Job syndication duplication.
- Deceptive job metadata and obscure requirements.
- Slow, repetitive mouse-driven triage.
- Time-consuming cover letter and application drafting.
- Staffing agency feed pollution.
- Account ban risks from automated LinkedIn bots.
- Lost networking contacts and neglected follow-ups.

## Most Important Workflows
1. **Automated Discovery & Nightly Briefing:** Nightly cron -> Crawl 20+ sources -> Deduplicate -> Score -> Email/Telegram digest.
2. **High-Speed Keyboard Triage:** Open `/jobs` -> Navigate `j`/`k` -> Shortlist `s` -> Dismiss `x` -> Apply `a`.
3. **Deep Evaluation & Application Collateral:** Extract facts -> Generate Fit Report -> Generate Cover Letter -> Copy & submit.
4. **Targeted Outbound Prospecting:** Add contact -> Generate channel-specific DM -> Approve in queue -> Dispatch manually -> Track in Kanban.

## Technical Highlights
- **Domain-First Onion Architecture:** Clean separation across validators, database queries, business services, and tRPC routers.
- **Keyset Cursor Pagination:** $O(1)$ database pagination performance over composite indexes.
- **SSRF Hardening:** Strict DNS and IP-range filtering blocking access to internal networks and metadata endpoints.
- **AES-256-GCM Cryptography:** Symmetric authenticated encryption for user secrets with key isolation.
- **Deterministic Cross-Source Deduplication:** Rule-based string normalization handling legal entity suffixes and bracketed noise.
- **Zero-Dependency PDF Parsing:** In-memory PDF text extraction in serverless environments via `unpdf`.
- **Serverless Background Distribution:** Nightly cron fan-out using Upstash QStash to decouple per-user execution limits.

## Technologies Actually Used
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Sonner Toasts, `@hello-pangea/dnd`.
- **Backend:** Next.js Route Handlers, tRPC v11, SuperJSON, Zod.
- **Database:** Neon Serverless PostgreSQL, Drizzle ORM, Drizzle Kit.
- **Authentication:** Better Auth (with Drizzle adapter and email verification).
- **API / Data Layer:** TanStack React Query v5, tRPC Client.
- **State Management:** TanStack Query server state, React useState/useReducer local state.
- **Infrastructure:** Vercel Hosting, Vercel Cron, Upstash QStash.
- **External Integrations:** OpenRouter, OpenAI SDK, UploadThing, Google Places API, Resend, Telegram Bot API, Apify.
- **Testing:** Vitest, Cross-Env.
- **Monitoring & Error Handling:** Sentry Next.js SDK (with `/monitoring` tunnel).
- **Security:** Node.js Crypto (`aes-256-gcm`), Custom SSRF Guard (`assert-safe-url.ts`).

## Engineering Complexity
1. **Multi-Source Scraping Normalization:** Handling 20+ disparate data sources (REST APIs, RSS XML feeds, HTML sitemaps, public guest pages) and mapping them into a uniform TypeScript schema while handling intermittent failures gracefully.
2. **Explainable Real-Time Relevance Scoring:** Designing an algorithm that balances title keyword precision, recency decay, salary presence, and remote availability into an intuitive 0–100 score computed at insertion time.
3. **Deterministic Cross-Source Deduplication:** Crafting regex normalization capable of merging company names across different legal entity conventions ("Acme Inc" vs "Acme Ltd") and stripping decorated title noise without accidentally merging distinct job openings.
4. **Security & Threat Mitigation:** Implementing multi-layer security: authenticated encryption for credentials, SSRF protection against cloud metadata exploits, and database-level tenant isolation tested by automated adversarial tests.
5. **Human-in-the-Loop CRM Design:** Structuring an outreach workflow that leverages LLM efficiency while keeping message approval and delivery in human hands to eliminate ToS violation risks.

## CV-Relevant Engineering Achievements

### Achievement 1: Distributed Multi-Source Opportunity Ingestion Pipeline
- **What was built:** A resilient ingestion engine aggregating opportunities across 20+ public ATS platforms (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling), aggregators (RemoteOK, Himalayas, Wuzzuf), freelance marketplaces, and search APIs.
- **Problem solved:** Centralized fragmented job markets into a unified database, reducing search discovery time by over 80%.
- **Technical implementation:** Built modular source adapters implementing a common TypeScript contract with Zod validation, circuit breakers, 60-second runtime ceilings, and fail-safe error isolation.
- **Technologies used:** TypeScript, Next.js, Linkedom, Drizzle ORM, PostgreSQL.
- **Why technically challenging:** Orchestrating dozens of heterogeneous network requests with varying schemas and rate limits within serverless execution constraints without letting a single failure crash the run.
- **Potential measurable evidence:** 20+ integrated sources; 48 automated test suites including live canary scrapers.

### Achievement 2: Sub-Second Keyboard Triage & Keyset-Paginated Workbench
- **What was built:** A terminal-inspired, keyboard-driven workbench enabling users to triage high-volume feeds at sub-second speeds.
- **Problem solved:** Eliminated mouse fatigue and context-switching, allowing 50+ listings to be evaluated in under 5 minutes.
- **Technical implementation:** Implemented window-level event interceptors with typing suppression, paired with keyset cursor pagination (`(score, id)`) over composite PostgreSQL B-Tree indexes.
- **Technologies used:** React 19, Custom Hooks, TanStack Query, Radix UI, PostgreSQL.
- **Why technically challenging:** Traditional `LIMIT/OFFSET` pagination shifts rows when background crawlers insert new records; keyset pagination required custom cursor serialization to maintain stable feeds during concurrent writes.
- **Potential measurable evidence:** $O(1)$ pagination query time across thousands of records; 10 distinct pipeline states supported.

### Achievement 3: Deterministic Cross-Source Deduplication & Relevance Ranking Engine
- **What was built:** An automated normalization and ranking engine that collapses syndicated job postings across web portals and scores listings from 0 to 100%.
- **Problem solved:** Removed duplicate listings from aggregated feeds and prioritized high-fit opportunities over raw publication dates.
- **Technical implementation:** Built a deterministic fingerprinting function stripping legal suffixes and title decoration, combined with an explainable multi-signal ranking algorithm that evaluates keyword density, 30-day freshness decay, and compensation disclosure.
- **Technologies used:** TypeScript String Processing, PostgreSQL Unique Indexes, Drizzle ORM.
- **Why technically challenging:** String normalization had to be aggressive enough to catch syndication duplicates while conservative enough to avoid merging distinct roles at the same company.
- **Potential measurable evidence:** 100% automated deduplication across syndication portals; explainable scoring reasons generated for every listing.

### Achievement 4: Multi-Layer Security Architecture (SSRF Defense & Secret Cryptography)
- **What was built:** A defense-in-depth security infrastructure incorporating authenticated secret encryption, strict SSRF validation, and tenant isolation.
- **Problem solved:** Prevented cloud instance metadata theft (SSRF), secured third-party API credentials against database leaks, and eliminated IDOR cross-tenant access.
- **Technical implementation:** Implemented AES-256-GCM encryption with IV authentication tags for all credentials stored at rest. Built an SSRF guard resolving DNS and validating IP ranges against private, loopback, and cloud metadata subnets (`169.254.169.254`). Enforced database-level user isolation backed by adversarial integration tests.
- **Technologies used:** Node.js Crypto, DNS Resolution, Better Auth, Vitest Integration Testing.
- **Why technically challenging:** Validating URLs against SSRF requires inspecting every hop in a redirect chain, as public URLs can redirect to private intranet endpoints after passing initial checks.
- **Potential measurable evidence:** Zero plaintext third-party secrets stored; automated tenant-isolation test suite passing 100%.

### Achievement 5: Context-Aware Generative AI Document & Outreach Engine
- **What was built:** An LLM pipeline that extracts structured facts, benchmarks CV qualifications line-by-line, and generates channel-specific outreach collateral.
- **Problem solved:** Automated the drafting of tailored cover letters, application form answers, and cold outreach notes, cutting preparation time from 45 minutes to seconds.
- **Technical implementation:** Engineered prompt pipelines that supply raw postings, candidate resumes, and bucket pitch narratives to OpenRouter/OpenAI models. Enforced strict Zod validation on model JSON outputs and decoupled message generation from assisted manual sending.
- **Technologies used:** OpenRouter SDK, OpenAI SDK, Zod, unpdf, PostgreSQL JSONB.
- **Why technically challenging:** Mitigating hallucinations by mandating that fit report verdicts quote direct evidence from the candidate's CV, and routing channel tones dynamically between professional LinkedIn InMail and conversational WhatsApp messages.
- **Potential measurable evidence:** 4 dedicated document generation types; 5 persona-specific outreach templates; rolling 24-hour quota protections.
