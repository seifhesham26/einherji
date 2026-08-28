CREATE TYPE "public"."job_document_kind" AS ENUM('cover_letter', 'application_answer', 'cv_bullets', 'interview_prep');--> statement-breakpoint
CREATE TYPE "public"."remote_policy" AS ENUM('remote', 'hybrid', 'onsite', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."seniority_level" AS ENUM('intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'unknown');--> statement-breakpoint
ALTER TYPE "public"."usage_action" ADD VALUE 'extract_job_facts';--> statement-breakpoint
ALTER TYPE "public"."usage_action" ADD VALUE 'generate_fit_report';--> statement-breakpoint
ALTER TYPE "public"."usage_action" ADD VALUE 'generate_document';--> statement-breakpoint
CREATE TABLE "job_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"kind" "job_document_kind" NOT NULL,
	"prompt" text,
	"body" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_fit_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"match_percent" integer NOT NULL,
	"summary" text NOT NULL,
	"requirements" jsonb NOT NULL,
	"gaps" text[] DEFAULT '{}' NOT NULL,
	"emphasise" text[] DEFAULT '{}' NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "seniority" "seniority_level";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "years_experience_min" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "tech_stack" text[];--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_min_annual" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_max_annual" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "salary_currency" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "remote_policy" "remote_policy";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "offers_visa_sponsorship" boolean;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "posting_language" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "facts_extracted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "openrouter_api_key" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "openai_api_key" text;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_fit_reports" ADD CONSTRAINT "job_fit_reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_fit_reports" ADD CONSTRAINT "job_fit_reports_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_documents_user_job_idx" ON "job_documents" USING btree ("user_id","job_id","created_at" desc);--> statement-breakpoint
CREATE UNIQUE INDEX "job_fit_reports_user_job_idx" ON "job_fit_reports" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "jobs_user_unextracted_idx" ON "jobs" USING btree ("user_id") WHERE "jobs"."facts_extracted_at" is null;