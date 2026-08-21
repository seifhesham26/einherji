ALTER TABLE "leads" DROP CONSTRAINT "leads_bucket_id_buckets_id_fk";
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE set null ON UPDATE no action;