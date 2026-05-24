import type { jobs } from "@/lib/db/schema";

export type Job = typeof jobs.$inferSelect;
