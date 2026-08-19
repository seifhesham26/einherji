ALTER TYPE "public"."job_source" ADD VALUE 'google_places' BEFORE 'linkedin_guest';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "bucket_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_bucket_idx" ON "leads" USING btree ("bucket_id");