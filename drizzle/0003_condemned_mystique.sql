CREATE INDEX "criteria_user_active_idx" ON "criteria" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "leads_user_status_idx" ON "leads" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "leads_user_next_action_idx" ON "leads" USING btree ("user_id","next_action_at");--> statement-breakpoint
CREATE INDEX "leads_job_idx" ON "leads" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "messages_user_status_idx" ON "messages" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "messages_user_lead_idx" ON "messages" USING btree ("user_id","lead_id");--> statement-breakpoint
CREATE INDEX "messages_lead_idx" ON "messages" USING btree ("lead_id");