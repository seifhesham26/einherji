import { pgTable, text, integer, timestamp, boolean, pgEnum, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Better Auth Tables ───────────────────────────────────────────────────────
// Required by Better Auth's Drizzle adapter

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── Enums ────────────────────────────────────────────────────────────────────

export const leadStatusEnum = pgEnum("lead_status", [
  "not_contacted",
  "message_sent",
  "reply_received",
  "call_scheduled",
  "interview",
  "offer",
  "rejected",
  "no_response",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "draft",
  "approved",
  "sent",
  "edited",
]);

// Where a job row came from. "apify" is retained so historical rows stay readable
// after the Apify integration is removed.
export const jobSourceEnum = pgEnum("job_source", [
  // Company job boards — need a company slug, driven by tracked_companies
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "rippling",
  // Aggregators — keyword-searchable, no company list needed
  "remoteok",
  "arbeitnow",
  "jobicy",
  "themuse",
  "himalayas",
  "weworkremotely",
  "hackernews",
  // Egypt / MENA — read from the sitemap Wuzzuf publishes for crawlers
  "wuzzuf",
  // Freelance / contract marketplaces
  "freelancer",
  "hackernews_freelance",
  // Credentialed — require an API key the user supplies in Settings
  "adzuna",
  "reddit",
  "twitter",
  "serpapi",
  "google_places",
  // Scraped
  "linkedin_guest",
  "apify",
]);

// What kind of engagement a listing is. Matters now that the app covers both
// permanent roles and freelance project work.
export const workTypeEnum = pgEnum("work_type", [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
  "unknown",
]);

// What a bucket is hunting for. Drives the wording, the sensible default
// sources, and which template the message generator reaches for.
export const bucketKindEnum = pgEnum("bucket_kind", [
  "jobs",       // roles for yourself
  "clients",    // businesses that might buy what you build
  "suppliers",  // businesses you want to buy from
  "custom",
]);

export const scrapeStatusEnum = pgEnum("scrape_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

// Where a job has got to. This is the application pipeline: a scraped row starts
// as something you haven't looked at and ends as something that happened.
//
// It replaces `is_processed`, which was a single boolean meaning "we ran a
// hiring-manager lookup on this" — a fact about an internal step rather than
// about your hunt, and unreachable since that lookup started demanding a
// logged-in LinkedIn session.
//
// Order matters: the UI reads this array to lay the pipeline out left to right,
// so the terminal states are grouped at the end rather than sorted in.
export const jobStatusEnum = pgEnum("job_status", [
  "new",
  "shortlisted",
  "applying",
  "applied",
  "screening",
  "interviewing",
  "offer",
  // ── Terminal ──
  "rejected",
  "ghosted",
  "dismissed",
]);

// What happened to a job. Kept coarse on purpose: the point is a readable
// history, not an audit log, so a note and a status change are the same kind of
// thing seen from the user's side.
export const jobEventKindEnum = pgEnum("job_event_kind", [
  "status_change",
  "note",
  "reminder_set",
]);

// Why a job was dropped. Deliberately a short closed list rather than free text:
// the point is to be able to count them later — "you dismiss 40% of what Wuzzuf
// returns for wrong seniority" is a fact the matcher can act on, and a thousand
// distinct sentences are not.
export const jobDismissReasonEnum = pgEnum("job_dismiss_reason", [
  "wrong_seniority",
  "wrong_stack",
  "location",
  "salary",
  "company",
  // Not a judgement the user made on this posting — a rule they wrote earlier
  // swept it up. Kept apart from the rest so the human reasons stay countable
  // on their own.
  "muted",
  "other",
]);

// How senior the posting is, read out of the description rather than the title.
// Titles lie in both directions — "Senior" on a role wanting two years, nothing
// at all on one wanting eight.
export const seniorityLevelEnum = pgEnum("seniority_level", [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "lead",
  "unknown",
]);

// What the posting actually says about where the work happens. Separate from
// jobs.is_remote, which is whatever flag the board set — boards call a role
// remote when it means "remote, three days a week in Berlin".
export const remotePolicyEnum = pgEnum("remote_policy", [
  "remote",
  "hybrid",
  "onsite",
  "unknown",
]);

// What the AI wrote about a job, per kind. One table rather than four columns:
// they share a shape (a prompt, a body, the model that produced it) and differ
// only in what was asked for.
export const jobDocumentKindEnum = pgEnum("job_document_kind", [
  "cover_letter",
  "application_answer",
  "cv_bullets",
  "interview_prep",
]);

// What a mute rule matches on. Company and title are the only two that earn a
// rule — the same staffing agency reappearing forty times, or a title pattern
// ("Sales", "Intern") the search keeps dragging in.
export const muteRuleKindEnum = pgEnum("mute_rule_kind", ["company", "title"]);

// ─── Criteria ─────────────────────────────────────────────────────────────────
// The user's job search preferences. One active record at a time.

export const criteria = pgTable("criteria", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  titles: text("titles").array().notNull(),
  salaryMin: integer("salary_min"),
  locations: text("locations").array().notNull(),
  companySizeMin: integer("company_size_min"),
  companySizeMax: integer("company_size_max"),
  industries: text("industries").array(),
  skills: text("skills").array(),
  resumeText: text("resume_text"),
  elevatorPitch: text("elevator_pitch"),

  // AI model used for message generation — selectable in the criteria form
  model: text("model").default("meta-llama/llama-3.3-70b-instruct:free"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // getActiveCriteria filters on exactly this pair, and it runs on nearly every
  // scrape and message generation. The userId prefix also serves deactivate.
  index("criteria_user_active_idx").on(table.userId, table.isActive),
]);

// ─── Jobs ─────────────────────────────────────────────────────────────────────
// Scraped from LinkedIn via Apify

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Which hunt turned this up. Nullable: rows predating buckets keep working and
  // show under "All".
  bucketId: text("bucket_id").references(() => buckets.id, { onDelete: "cascade" }),

  source: jobSourceEnum("source").notNull().default("apify"),
  // NOT NULL matters: Postgres treats NULLs as distinct in unique indexes, so a
  // nullable id would silently defeat the dedupe below and duplicate every scrape.
  sourceJobId: text("source_job_id").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companyUrl: text("company_url"),
  companySize: text("company_size"),
  location: text("location"),
  salary: text("salary"),
  description: text("description"),
  jobUrl: text("job_url").notNull(),
  postedAt: timestamp("posted_at"),

  workType: workTypeEnum("work_type").notNull().default("unknown"),
  isRemote: boolean("is_remote"),
  tags: text("tags").array(),
  // Some sources (RemoteOK) require visible attribution as a condition of their
  // API terms. Stored per-job so the UI can render it correctly.
  attributionText: text("attribution_text"),
  attributionUrl: text("attribution_url"),

  // ── Pipeline ──
  status: jobStatusEnum("status").notNull().default("new"),
  statusChangedAt: timestamp("status_changed_at"),
  // Kept separate from statusChangedAt: "when did I apply" is a question you ask
  // months later, and by then the status has moved on several times.
  appliedAt: timestamp("applied_at"),
  notes: text("notes"),
  // Same shape as leads.next_action_at, so follow-up reminders can eventually
  // read both from one query rather than growing a second mechanism.
  nextActionAt: timestamp("next_action_at"),
  // Set alongside a move to dismissed, cleared when the job is reopened. On the
  // row rather than only in the event body so it can be grouped and counted
  // without parsing history.
  dismissReason: jobDismissReasonEnum("dismiss_reason"),

  // ── Ranking ──
  // scoreJob runs at insert time and the result is stored, because sorting by
  // relevance has to happen in the database. Scoring on read meant every row had
  // to be shipped to the client before the best one could be identified.
  score: integer("score"),
  // Why it scored what it did. Stored alongside so a surprising ranking can be
  // argued with rather than just distrusted.
  scoreReasons: text("score_reasons").array(),

  // ── Extracted facts ──
  // Read out of the description once by a model, then stored — because the point
  // of extracting them is that they become filters, and a filter has to run in
  // the database. Kept as columns on the job rather than a side table for the
  // same reason: a WHERE clause across a join is a WHERE clause nobody writes.
  seniority: seniorityLevelEnum("seniority"),
  yearsExperienceMin: integer("years_experience_min"),
  techStack: text("tech_stack").array(),
  // Normalised to a year, whatever period the posting quoted, so "60k" and
  // "5k per month" are comparable. No currency conversion happens — that needs
  // live FX rates this app has no source for — so the currency is stored beside
  // the number and shown, rather than pretending the figures share a scale.
  salaryMinAnnual: integer("salary_min_annual"),
  salaryMaxAnnual: integer("salary_max_annual"),
  salaryCurrency: text("salary_currency"),
  remotePolicy: remotePolicyEnum("remote_policy"),
  // Null means the posting did not say, which is different from "no". Most do
  // not say, and reading silence as a refusal would hide most of the market.
  offersVisaSponsorship: boolean("offers_visa_sponsorship"),
  // ISO 639-1. Worth knowing before you apply in the wrong language.
  postingLanguage: text("posting_language"),
  // Set when extraction succeeds. Also the backlog marker — null means this job
  // has never been read.
  factsExtractedAt: timestamp("facts_extracted_at"),

  // ── Freshness ──
  // Refreshed every time a scrape re-encounters the posting. A row whose
  // lastSeenAt has stopped moving is a posting that has come down.
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),

  // ── Cross-source identity ──
  // A normalised company + title + location fingerprint. The unique index below
  // is per source, so a role syndicated to RemoteOK and Arbeitnow lands twice;
  // this is what lets the second copy be recognised and folded into the first.
  dedupeKey: text("dedupe_key"),
  // The other sources this same posting was found on, so folding a duplicate
  // away doesn't lose the fact that it was there.
  alsoOnSources: text("also_on_sources").array(),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Deduplicate per user — the same job can legitimately appear for different users,
  // and the same id can repeat across sources.
  uniqueIndex("jobs_user_source_id_idx").on(table.userId, table.source, table.sourceJobId),
  // The list's default read: one user's jobs in a status, best first. Ordering is
  // part of the index because "top of the list" is the only page most users see,
  // and a sort over every row to produce twenty is the whole cost of the query.
  index("jobs_user_status_score_idx").on(table.userId, table.status, desc(table.score)),
  // The duplicate lookup, which runs once per scraped batch.
  index("jobs_user_dedupe_idx").on(table.userId, table.dedupeKey),
  // Overdue follow-ups, the same query leads answers from its own table.
  index("jobs_user_next_action_idx").on(table.userId, table.nextActionAt),
  index("jobs_bucket_idx").on(table.bucketId),
  // "What still needs reading" — the backlog the extraction pass works through.
  // Partial, because the answer is empty for a well-tended account, and a full
  // index over every job to find none of them is pure write cost.
  index("jobs_user_unextracted_idx")
    .on(table.userId)
    .where(sql`${table.factsExtractedAt} is null`),
]);

// ─── Job events ───────────────────────────────────────────────────────────────
// One row per thing that happened to a job. Without it a status column tells you
// where something is and nothing about how it got there — and "when did I apply,
// and what did I say" is most of what you want from an application months later.

export const jobEvents = pgTable("job_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Cascade: an event is meaningless without the job it describes, unlike a lead,
  // which is a person who outlives the posting.
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),

  kind: jobEventKindEnum("kind").notNull(),
  // Null on a note — there was no transition, which is exactly the difference.
  fromStatus: jobStatusEnum("from_status"),
  toStatus: jobStatusEnum("to_status"),
  body: text("body"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // The timeline read: one job's history, newest first.
  index("job_events_user_job_time_idx").on(table.userId, table.jobId, desc(table.createdAt)),
]);

// ─── Fit reports ──────────────────────────────────────────────────────────────
// The model's answer to "is this one worth applying to". Distinct from
// jobs.score, which is a keyword count cheap enough to run on every row — this
// reads the description against the CV, costs a completion, and is therefore
// asked for one job at a time and kept.

export const jobFitReports = pgTable("job_fit_reports", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),

  // 0-100, the headline. Deliberately not written back onto jobs.score: the two
  // measure different things, and overwriting the cheap one with the expensive
  // one would make the list's order depend on which jobs you happened to open.
  matchPercent: integer("match_percent").notNull(),
  summary: text("summary").notNull(),
  // [{ requirement, verdict, evidence }] — the requirement-by-requirement table.
  // jsonb because it is read whole and never queried into.
  requirements: jsonb("requirements").notNull(),
  // What you are missing, and what to lead with if you apply anyway.
  gaps: text("gaps").array().notNull().default([]),
  emphasise: text("emphasise").array().notNull().default([]),

  model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // One report per job. Re-running replaces it rather than accumulating
  // versions — a fit report is a current answer, not a history.
  uniqueIndex("job_fit_reports_user_job_idx").on(table.userId, table.jobId),
]);

// ─── Job documents ────────────────────────────────────────────────────────────
// The things you would otherwise write by hand for every application: the cover
// letter, the essay answers, CV bullets pointed at this description, interview
// prep. The expensive part of applying, and until now the part the app helped
// with least.

export const jobDocuments = pgTable("job_documents", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),

  kind: jobDocumentKindEnum("kind").notNull(),
  // The application's own question, for an answer. Null for the kinds that carry
  // one fixed brief.
  prompt: text("prompt"),
  body: text("body").notNull(),

  model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // The panel's read: this job's documents, newest first. No unique constraint —
  // an application asks four different questions, and two drafts of a cover
  // letter are two things worth comparing.
  index("job_documents_user_job_idx").on(table.userId, table.jobId, desc(table.createdAt)),
]);

// ─── Mute rules ───────────────────────────────────────────────────────────────
// Things the user never wants to see again. Applied when a scrape writes, not
// when the list reads: a muted posting should never occupy a row, and filtering
// on read would leave it counted in every total and re-offered on every page.

export const muteRules = pgTable("mute_rules", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  kind: muteRuleKindEnum("kind").notNull(),
  // Stored as the user typed it, so the list they manage reads back the way they
  // wrote it. Matching normalises both sides at comparison time instead.
  pattern: text("pattern").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Every read is "all of this user's rules" — they are loaded whole, once per
  // scrape, because matching happens in TypeScript against normalised text.
  index("mute_rules_user_idx").on(table.userId),
  // The same rule twice is a no-op that still has to be matched against every
  // scraped row. Kind is part of the key: muting the company "Sales Force" and
  // the title word "sales force" are different intentions.
  uniqueIndex("mute_rules_user_kind_pattern_idx").on(table.userId, table.kind, table.pattern),
]);

// ─── Saved views ──────────────────────────────────────────────────────────────
// A named set of filters. "Remote, 70+, this week, not dismissed" is a question
// asked every morning, and rebuilding it by hand each time is the reason people
// stop filtering at all.

export const savedViews = pgTable("saved_views", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  // The filter set, validated by savedViewFiltersSchema on the way in and parsed
  // again on the way out. jsonb rather than a column per filter because the
  // filters change as the list grows new ones, and a migration per filter is a
  // migration nobody will write.
  filters: jsonb("filters").notNull(),
  // Tab order, set by the user. Integer rather than an array on the user row so
  // reordering one view doesn't rewrite the whole list.
  position: integer("position").notNull().default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // The tab strip: one user's views, in their order.
  index("saved_views_user_position_idx").on(table.userId, table.position),
  // Two tabs with the same name are indistinguishable once rendered.
  uniqueIndex("saved_views_user_name_idx").on(table.userId, table.name),
]);

// ─── Leads ────────────────────────────────────────────────────────────────────
// Hiring managers found for each job

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Which hunt this contact belongs to. Without it a hundred imported paper
  // customers would sit in the same list as a job search's hiring managers.
  // Nullable so contacts added before buckets existed still work.
  //
  // Set null, not cascade — the same reasoning as jobId above. A contact is a
  // person (or a business) you know, not a search result: deleting the hunt that
  // turned them up must not delete them. It shipped as cascade in migration 0010,
  // which meant deleting a bucket silently destroyed every contact filed under it
  // and, through messages.lead_id, every message written to them.
  bucketId: text("bucket_id").references(() => buckets.id, { onDelete: "set null" }),
  // Set null, not cascade: a hiring manager is still a real contact after the
  // posting they came from is gone. It also unblocks deleteJobsBySource, which
  // currently throws a foreign key violation whenever a lead references a job
  // being removed — reachable today by toggling a source off after Find Managers.
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),

  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  title: text("title"),
  company: text("company").notNull(),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  // Egyptian B2B outreach runs on phone and WhatsApp, not email — and for a
  // business prospect this is usually the only contact route there is.
  phone: text("phone"),
  // Google's stable identifier for a place. The one Places field their terms
  // allow storing indefinitely; everything else displayable has to be re-fetched.
  placeId: text("place_id"),
  headline: text("headline"),
  about: text("about"),
  recentPosts: text("recent_posts"),

  status: leadStatusEnum("status").default("not_contacted"),
  lastContactedAt: timestamp("last_contacted_at"),
  nextActionAt: timestamp("next_action_at"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Every lead query starts with userId. status is included because getAllLeads
  // filters on it, and a leading-column prefix still serves the ones that don't.
  index("leads_user_status_idx").on(table.userId, table.status),
  // getOverdueFollowUps: where userId and nextActionAt <= now, ordered by it.
  index("leads_user_next_action_idx").on(table.userId, table.nextActionAt),
  // Not for reads — this is the referencing side of leads.job_id. Without it,
  // deleting jobs (deleteJobsBySource does, per source) scans this whole table.
  index("leads_job_idx").on(table.jobId),
  index("leads_bucket_idx").on(table.bucketId),
]);

// ─── User Settings ────────────────────────────────────────────────────────────
// Per-user configuration: profile extras + integration keys

export const userSettings = pgTable("user_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  jobTitle: text("job_title"),
  linkedinUrl: text("linkedin_url"),

  // Personal Apify API token. Per-account by design — Apify bills per run.
  apifyApiToken: text("apify_api_token"),

  // Personal AI keys. Every other third-party key here is per-account and
  // encrypted; these were the exception, billed to one server-wide key, which
  // works exactly until a second person logs in. Both optional — without them
  // the server key is used, which is right for a single-user install and wrong
  // for anything else.
  openrouterApiKey: text("openrouter_api_key"),
  openaiApiKey: text("openai_api_key"),

  // Which scrapers to run. Defaults to apify so existing users are unaffected
  // until they opt in to the self-hosted sources.
  jobSources: text("job_sources").array().notNull().default(["apify"]),

  // Optional unblocking proxy (ScraperAPI, ScrapingBee, Zyte…). Sites that serve
  // a JS shell or block datacenter IPs — Indeed, Glassdoor, Wellfound — are only
  // attempted when one of these is configured.
  scrapingProxyProvider: text("scraping_proxy_provider"),
  scrapingProxyApiKey: text("scraping_proxy_api_key"),

  // ── Daily run ──
  // Opt-in, and off by default: the cron spends the account's own scrape quota
  // and messages them, so it has to be asked for rather than assumed.
  dailyDigestEnabled: boolean("daily_digest_enabled").notNull().default(false),
  // Where the digest goes. An array rather than booleans so a third channel
  // doesn't need another column — same shape as jobSources.
  digestChannels: text("digest_channels").array().notNull().default(["email"]),
  // Telegram bot credentials, per account. The token is encrypted at rest like
  // every other third-party key; the chat id is not a secret.
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  // The window boundary for the next digest, and what stops a re-run of the cron
  // sending the same jobs twice.
  lastDigestSentAt: timestamp("last_digest_sent_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // The cron's own lookup: every account that wants a daily run.
  index("user_settings_digest_idx").on(table.dailyDigestEnabled),
]);

// ─── Buckets ──────────────────────────────────────────────────────────────────
// A named search with its own keywords, places and sources. One account runs
// several unrelated hunts at once — a job search, client prospecting, supplier
// sourcing — and a single set of criteria can't serve them: "React Developer"
// and "engineering firms in Cairo" are not the same query.

export const buckets = pgTable("buckets", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  kind: bucketKindEnum("kind").notNull().default("jobs"),

  // The search itself. Named "keywords" rather than "titles" because only the
  // jobs kind is looking for a job title.
  keywords: text("keywords").array().notNull().default([]),
  locations: text("locations").array().notNull().default([]),
  sources: text("sources").array().notNull().default([]),

  // What this bucket is offering, in its own words — the sender background for
  // generated messages. A paper factory pitches nothing like a developer does.
  pitch: text("pitch"),

  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("buckets_user_name_idx").on(table.userId, table.name),
  index("buckets_user_archived_idx").on(table.userId, table.isArchived),
]);

// ─── Tracked Companies ────────────────────────────────────────────────────────
// Companies whose ATS job board we poll directly. ATS APIs are keyed by slug —
// they can't be searched blind — so the user's target list is what drives them.

export const trackedCompanies = pgTable("tracked_companies", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  careersUrl: text("careers_url"),

  // Resolved by detect-ats, or entered by hand. Null means "not resolved yet".
  atsProvider: jobSourceEnum("ats_provider"),
  atsSlug: text("ats_slug"),

  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("tracked_companies_user_name_idx").on(table.userId, table.name),
]);

// ─── Source Credentials ───────────────────────────────────────────────────────
// Per-user API keys for sources that need them. Kept out of user_settings because
// each source needs a different shape (bearer token vs app id + secret vs both).
//
// Values are encrypted at rest with AES-256-GCM. That happens in credentials.db,
// so nothing above it handles ciphertext and nothing below it sees a readable
// key — see lib/crypto/secret-box.ts.

export const sourceCredentials = pgTable("source_credentials", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  source: jobSourceEnum("source").notNull(),
  // Shape varies by source: { apiKey }, { appId, apiKey }, { clientId, clientSecret }…
  credentials: jsonb("credentials").notNull().$type<Record<string, string>>(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("source_credentials_user_source_idx").on(table.userId, table.source),
]);

// ─── Scrape Runs ──────────────────────────────────────────────────────────────
// One row per scrape the user triggers. Gives the UI real progress instead of a
// spinner, and survives the request that started it.

export const scrapeRuns = pgTable("scrape_runs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  status: scrapeStatusEnum("status").notNull().default("queued"),
  sources: text("sources").array().notNull(),

  tasksTotal: integer("tasks_total").notNull().default(0),
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsInserted: integer("jobs_inserted").notNull().default(0),

  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
}, (table) => [
  index("scrape_runs_user_started_idx").on(table.userId, table.startedAt),
  // One live run per user, enforced by the database rather than by a read before
  // the insert. Double-clicking "Scrape" fires two mutations milliseconds apart —
  // exactly the window a check-then-insert guard misses — and two runs means
  // double the requests to the same boards from the same IP.
  uniqueIndex("scrape_runs_one_active_per_user_idx")
    .on(table.userId)
    .where(sql`${table.status} = 'running'`),
]);

// ─── Usage events ─────────────────────────────────────────────────────────────
// One row per billable action, so quotas survive a serverless cold start. An
// in-memory counter would reset on every new lambda and cap nothing.

export const usageActionEnum = pgEnum("usage_action", [
  "generate_message",
  "parse_cv",
  "find_managers",
  "scrape",
  // One completion each. Separate actions rather than one shared bucket, so a
  // batch extraction cannot eat the allowance for the cover letter you needed.
  "extract_job_facts",
  "generate_fit_report",
  "generate_document",
]);

export const usageEvents = pgTable("usage_events", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: usageActionEnum("action").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Every read is "this user, this action, since this time" — the whole query
  // is answered from the index.
  index("usage_events_user_action_time_idx").on(table.userId, table.action, table.createdAt),
]);

// ─── Messages ─────────────────────────────────────────────────────────────────
// AI-generated outreach messages, one per lead

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Cascade because leadId is NOT NULL — a message with no lead can't exist.
  leadId: text("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),

  body: text("body").notNull(),
  templateUsed: text("template_used"),

  status: messageStatusEnum("status").default("draft"),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  editedBody: text("edited_body"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // getMessages and getApprovedTodayCount both filter on this pair.
  index("messages_user_status_idx").on(table.userId, table.status),
  // getDraftForLead, which runs before every message generation. Also the
  // referencing side of messages.lead_id, so it keeps lead deletes off a scan.
  index("messages_user_lead_idx").on(table.userId, table.leadId),
  index("messages_lead_idx").on(table.leadId),
]);
