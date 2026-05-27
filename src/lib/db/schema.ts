import { pgTable, text, integer, timestamp, boolean, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
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

// ─── Criteria ─────────────────────────────────────────────────────────────────
// The user's job search preferences. One active record at a time.

export const criteria = pgTable("criteria", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),

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
  model: text("model").default("google/gemini-2.0-flash-exp:free"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Jobs ─────────────────────────────────────────────────────────────────────
// Scraped from LinkedIn via Apify

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),

  apifyId: text("apify_id"),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companySize: text("company_size"),
  location: text("location"),
  salary: text("salary"),
  description: text("description"),
  jobUrl: text("job_url").notNull(),
  postedAt: timestamp("posted_at"),

  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Deduplicate per user — same job can appear for different users
  uniqueIndex("jobs_user_apify_idx").on(table.userId, table.apifyId),
]);

// ─── Leads ────────────────────────────────────────────────────────────────────
// Hiring managers found for each job

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),
  jobId: text("job_id").references(() => jobs.id),

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
});

// ─── User Settings ────────────────────────────────────────────────────────────
// Per-user configuration: profile extras + integration keys

export const userSettings = pgTable("user_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

  jobTitle: text("job_title"),
  linkedinUrl: text("linkedin_url"),

  // Personal Apify API token — overrides the server-wide APIFY_API_TOKEN env var
  apifyApiToken: text("apify_api_token"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Messages ─────────────────────────────────────────────────────────────────
// AI-generated outreach messages, one per lead

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),
  leadId: text("lead_id").references(() => leads.id).notNull(),
  jobId: text("job_id").references(() => jobs.id),

  body: text("body").notNull(),
  templateUsed: text("template_used"),

  status: messageStatusEnum("status").default("draft"),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  editedBody: text("edited_body"),

  createdAt: timestamp("created_at").defaultNow(),
});
