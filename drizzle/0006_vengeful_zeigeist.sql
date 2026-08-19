ALTER TABLE "user_settings" ADD COLUMN "daily_digest_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "last_digest_sent_at" timestamp;--> statement-breakpoint
CREATE INDEX "user_settings_digest_idx" ON "user_settings" USING btree ("daily_digest_enabled");