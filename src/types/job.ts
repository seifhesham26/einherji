import type { jobEvents, jobs } from "@/lib/db/schema";

export type Job = typeof jobs.$inferSelect;

export type JobEvent = typeof jobEvents.$inferSelect;
