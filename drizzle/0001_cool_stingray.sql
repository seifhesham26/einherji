CREATE TYPE "public"."work_type" AS ENUM('full_time', 'part_time', 'contract', 'freelance', 'internship', 'unknown');--> statement-breakpoint
CREATE TABLE "source_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" "job_source" NOT NULL,
	"credentials" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source" SET DEFAULT 'apify'::text;--> statement-breakpoint
ALTER TABLE "source_credentials" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tracked_companies" ALTER COLUMN "ats_provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."job_source";--> statement-breakpoint
CREATE TYPE "public"."job_source" AS ENUM('greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters', 'rippling', 'remoteok', 'arbeitnow', 'jobicy', 'themuse', 'himalayas', 'weworkremotely', 'hackernews', 'freelancer', 'hackernews_freelance', 'adzuna', 'reddit', 'twitter', 'serpapi', 'linkedin_guest', 'apify');--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source" SET DEFAULT 'apify'::"public"."job_source";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "source" SET DATA TYPE "public"."job_source" USING "source"::"public"."job_source";--> statement-breakpoint
ALTER TABLE "source_credentials" ALTER COLUMN "source" SET DATA TYPE "public"."job_source" USING "source"::"public"."job_source";--> statement-breakpoint
ALTER TABLE "tracked_companies" ALTER COLUMN "ats_provider" SET DATA TYPE "public"."job_source" USING "ats_provider"::"public"."job_source";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "work_type" "work_type" DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "is_remote" boolean;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "attribution_text" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "attribution_url" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "scraping_proxy_provider" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "scraping_proxy_api_key" text;--> statement-breakpoint
ALTER TABLE "source_credentials" ADD CONSTRAINT "source_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "source_credentials_user_source_idx" ON "source_credentials" USING btree ("user_id","source");