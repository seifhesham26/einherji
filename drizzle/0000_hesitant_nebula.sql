-- Baseline migration.
--
-- The Better Auth tables and the criteria/jobs/leads/messages/user_settings tables
-- were created with `drizzle-kit push` before migrations were introduced, so this
-- file transitions that existing schema to the 0000 snapshot rather than creating
-- it from scratch. Everything from here on is a normal generated migration.

CREATE TYPE "public"."job_source" AS ENUM('linkedin_guest', 'greenhouse', 'lever', 'ashby', 'workable', 'apify');--> statement-breakpoint
CREATE TYPE "public"."scrape_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint

DROP INDEX IF EXISTS "jobs_user_apify_idx";--> statement-breakpoint
ALTER TABLE "jobs" RENAME COLUMN "apify_id" TO "source_job_id";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source_job_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "source" "job_source" DEFAULT 'apify' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "company_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_user_source_id_idx" ON "jobs" USING btree ("user_id","source","source_job_id");--> statement-breakpoint
CREATE INDEX "jobs_user_processed_idx" ON "jobs" USING btree ("user_id","is_processed");--> statement-breakpoint

ALTER TABLE "user_settings" ADD COLUMN "job_sources" text[] DEFAULT '{"apify"}' NOT NULL;--> statement-breakpoint

CREATE TABLE "tracked_companies" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"careers_url" text,
	"ats_provider" "job_source",
	"ats_slug" text,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "tracked_companies" ADD CONSTRAINT "tracked_companies_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tracked_companies_user_name_idx" ON "tracked_companies" USING btree ("user_id","name");--> statement-breakpoint

CREATE TABLE "scrape_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" "scrape_status" DEFAULT 'queued' NOT NULL,
	"sources" text[] NOT NULL,
	"tasks_total" integer DEFAULT 0 NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"jobs_found" integer DEFAULT 0 NOT NULL,
	"jobs_inserted" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);--> statement-breakpoint
ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scrape_runs_user_started_idx" ON "scrape_runs" USING btree ("user_id","started_at");
