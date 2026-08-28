CREATE TYPE "public"."job_dismiss_reason" AS ENUM('wrong_seniority', 'wrong_stack', 'location', 'salary', 'company', 'muted', 'other');--> statement-breakpoint
CREATE TYPE "public"."mute_rule_kind" AS ENUM('company', 'title');--> statement-breakpoint
CREATE TABLE "mute_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "mute_rule_kind" NOT NULL,
	"pattern" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "dismiss_reason" "job_dismiss_reason";--> statement-breakpoint
ALTER TABLE "mute_rules" ADD CONSTRAINT "mute_rules_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mute_rules_user_idx" ON "mute_rules" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mute_rules_user_kind_pattern_idx" ON "mute_rules" USING btree ("user_id","kind","pattern");--> statement-breakpoint
CREATE INDEX "saved_views_user_position_idx" ON "saved_views" USING btree ("user_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_views_user_name_idx" ON "saved_views" USING btree ("user_id","name");