CREATE TYPE "public"."bucket_kind" AS ENUM('jobs', 'clients', 'suppliers', 'custom');--> statement-breakpoint
CREATE TABLE "buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" "bucket_kind" DEFAULT 'jobs' NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"locations" text[] DEFAULT '{}' NOT NULL,
	"sources" text[] DEFAULT '{}' NOT NULL,
	"pitch" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "bucket_id" text;--> statement-breakpoint
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buckets_user_name_idx" ON "buckets" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "buckets_user_archived_idx" ON "buckets" USING btree ("user_id","is_archived");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_bucket_id_buckets_id_fk" FOREIGN KEY ("bucket_id") REFERENCES "public"."buckets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jobs_bucket_idx" ON "jobs" USING btree ("bucket_id");