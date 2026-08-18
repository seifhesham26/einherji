import { pgTable, text, integer, timestamp, boolean, pgEnum, uniqueIndex, index, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  // Freelance / contract marketplaces
  "freelancer",
  "hackernews_freelance",
  // Credentialed — require an API key the user supplies in Settings
  "adzuna",
  "reddit",
  "twitter",
  "serpapi",
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

export const scrapeStatusEnum = pgEnum("scrape_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

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

  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Deduplicate per user — the same job can legitimately appear for different users,
  // and the same id can repeat across sources.
  uniqueIndex("jobs_user_source_id_idx").on(table.userId, table.source, table.sourceJobId),
  index("jobs_user_processed_idx").on(table.userId, table.isProcessed),
]);

// ─── Leads ────────────────────────────────────────────────────────────────────
// Hiring managers found for each job

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

  // Which scrapers to run. Defaults to apify so existing users are unaffected
  // until they opt in to the self-hosted sources.
  jobSources: text("job_sources").array().notNull().default(["apify"]),

  // Optional unblocking proxy (ScraperAPI, ScrapingBee, Zyte…). Sites that serve
  // a JS shell or block datacenter IPs — Indeed, Glassdoor, Wellfound — are only
  // attempted when one of these is configured.
  scrapingProxyProvider: text("scraping_proxy_provider"),
  scrapingProxyApiKey: text("scraping_proxy_api_key"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
// NOTE: stored in plaintext today, same as user_settings.apifyApiToken. See
// AUDIT.md M10 — these should be encrypted at rest before real users arrive.

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
