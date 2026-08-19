ALTER TABLE "user_settings" ADD COLUMN "digest_channels" text[] DEFAULT '{"email"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "telegram_bot_token" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "telegram_chat_id" text;