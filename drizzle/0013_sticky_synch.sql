CREATE TYPE "public"."job_event_kind" AS ENUM('status_change', 'note', 'reminder_set');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('new', 'shortlisted', 'applying', 'applied', 'screening', 'interviewing', 'offer', 'rejected', 'ghosted', 'dismissed');--> statement-breakpoint
CREATE TABLE "job_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"kind" "job_event_kind" NOT NULL,
	"from_status" "job_status",
	"to_status" "job_status",
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "jobs_user_processed_idx";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status" "job_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "status_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "applied_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "next_action_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "score_reasons" text[];--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "last_seen_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "also_on_sources" text[];--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_events_user_job_time_idx" ON "job_events" USING btree ("user_id","job_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "jobs_user_status_score_idx" ON "jobs" USING btree ("user_id","status","score" desc);--> statement-breakpoint
CREATE INDEX "jobs_user_dedupe_idx" ON "jobs" USING btree ("user_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "jobs_user_next_action_idx" ON "jobs" USING btree ("user_id","next_action_at");