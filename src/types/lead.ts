import type { leads } from "@/lib/db/schema";

export type Lead = typeof leads.$inferSelect;
export type LeadStatus = NonNullable<Lead["status"]>;
