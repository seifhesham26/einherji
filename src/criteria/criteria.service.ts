import type { Database } from "@/lib/db";
import { extractCvFromUrl } from "@/lib/cv-parser";
import { consumeQuota } from "@/usage/usage.service";
import { deactivateUserCriteria, getActiveCriteria, insertCriteria } from "./criteria.db";
import type { ExtractFromCvInput, SaveCriteriaInput } from "./criteria.validators";

export async function fetchActiveCriteria(db: Database, userId: string) {
  return getActiveCriteria(db, userId);
}

// Goes through the service rather than the router calling lib/cv-parser directly
// (AUDIT M3), which is also what gives the quota somewhere to live.
export async function extractCv(db: Database, userId: string, input: ExtractFromCvInput) {
  await consumeQuota(db, userId, "parse_cv");
  return extractCvFromUrl(input.cvUrl, input.model);
}

export async function saveCriteria(db: Database, criteriaData: SaveCriteriaInput, userId: string) {
  // Deactivate only this user's existing criteria before saving new record
  await deactivateUserCriteria(db, userId);
  return insertCriteria(db, { ...criteriaData, userId });
}
