import { z } from "zod";

// Kept in step with usageActionEnum in lib/db/schema.ts.
export const usageActionValues = [
  "generate_message",
  "parse_cv",
  "find_managers",
  "scrape",
] as const;

export const usageActionSchema = z.enum(usageActionValues);

export type UsageAction = z.infer<typeof usageActionSchema>;

/**
 * What each action costs, and how much of it a user gets per rolling 24 hours.
 *
 * These are cost ceilings, not product limits — the point is that no bug, retry
 * loop or stolen session can run up an unbounded bill against OpenRouter or
 * Apify. They're deliberately well above real single-user usage.
 */
export const DAILY_QUOTAS: Record<UsageAction, number> = {
  // One AI completion each.
  generate_message: 50,
  // A CV is uploaded once and re-parsed rarely; this is generous already.
  parse_cv: 20,
  // The expensive one: each call runs an Apify actor over up to 5 profiles.
  find_managers: 25,
  // Cheap in money, but the real cost is the IP being blocked by job boards.
  scrape: 50,
};

export const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

// Shown in the error message, so the user knows what they hit.
export const USAGE_ACTION_LABELS: Record<UsageAction, string> = {
  generate_message: "message generations",
  parse_cv: "CV parses",
  find_managers: "hiring-manager searches",
  scrape: "scrapes",
};
