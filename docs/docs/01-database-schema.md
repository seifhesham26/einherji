# 01 — Database Schema (Drizzle + Neon)

## Setup
```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

---

## `src/lib/db/schema.ts`

```ts
import { pgTable, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ───────────────────────────────────────────────────────────────────

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
// The user's job search preferences. One active criteria at a time.

export const criteria = pgTable("criteria", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull(),

  // Role
  titles: text("titles").array().notNull(),           // ["Senior Frontend Developer", "Staff Engineer"]
  
  // Compensation
  salaryMin: integer("salary_min"),                   // 80000
  
  // Location
  locations: text("locations").array().notNull(),     // ["Remote, United States", "Cairo, Egypt"]
  
  // Company
  companySizeMin: integer("company_size_min"),        // 50
  companySizeMax: integer("company_size_max"),        // 1000
  
  // Industry
  industries: text("industries").array(),             // ["SaaS", "Fintech"]
  
  // Skills
  skills: text("skills").array(),                     // ["React", "TypeScript", "Next.js"]
  
  // Resume / background context for Claude
  resumeText: text("resume_text"),
  elevatorPitch: text("elevator_pitch"),

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Jobs ──────────────────────────────────────────────────────────────────────
// Scraped from LinkedIn via Apify

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  
  // From Apify scrape
  apifyId: text("apify_id").unique(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  companySize: text("company_size"),
  location: text("location"),
  salary: text("salary"),
  description: text("description"),
  jobUrl: text("job_url").notNull(),
  postedAt: timestamp("posted_at"),

  // Internal
  isProcessed: boolean("is_processed").default(false),   // hiring manager found?
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Leads ─────────────────────────────────────────────────────────────────────
// Hiring managers / contacts found for each job

export const leads = pgTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  jobId: text("job_id").references(() => jobs.id),

  // Person info (from Apify LinkedIn Profile Scraper)
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  title: text("title"),
  company: text("company").notNull(),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  headline: text("headline"),
  about: text("about"),
  recentPosts: text("recent_posts"),                  // JSON string

  // Outreach tracking
  status: leadStatusEnum("status").default("not_contacted"),
  lastContactedAt: timestamp("last_contacted_at"),
  nextActionAt: timestamp("next_action_at"),
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Messages ─────────────────────────────────────────────────────────────────
// AI-generated outreach messages, one per lead

export const messages = pgTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  leadId: text("lead_id").references(() => leads.id).notNull(),
  jobId: text("job_id").references(() => jobs.id),

  // Content
  body: text("body").notNull(),
  templateUsed: text("template_used"),               // "hiring_manager" | "recruiter" | "referral"

  // Status
  status: messageStatusEnum("status").default("draft"),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  editedBody: text("edited_body"),                   // if user edits before approving

  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## `src/lib/db/index.ts`

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

## `drizzle.config.ts`

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

## Migration Commands
```bash
# Generate migration
npx drizzle-kit generate:pg

# Push to Neon
npx drizzle-kit push:pg
```
