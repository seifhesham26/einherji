import type { Database } from "@/lib/db";
import { extractCvFromUrl } from "@/lib/cv-parser";
import { admitAiAction } from "@/usage/ai-admission";
import { DEFAULT_MODEL } from "./criteria.validators";
import { getSettingsByUserId } from "@/settings/settings.db";
import { deactivateUserCriteria, getActiveCriteria, insertCriteria } from "./criteria.db";
import type { ExtractFromCvInput, SaveCriteriaInput } from "./criteria.validators";

export async function fetchActiveCriteria(db: Database, userId: string) {
  return getActiveCriteria(db, userId);
}

// Goes through the service rather than the router calling lib/cv-parser directly
// (AUDIT M3), which is also what gives the quota somewhere to live.
export async function extractCv(db: Database, userId: string, input: ExtractFromCvInput) {
  // The account pays for its own parse when it has supplied a key, the same way
  // it does for every other AI call now.
  const settings = await getSettingsByUserId(db, userId);

  const credentials = {
    openrouterApiKey: settings?.openrouterApiKey ?? null,
    openaiApiKey: settings?.openaiApiKey ?? null,
  };
  const model = input.model ?? DEFAULT_MODEL;
  await admitAiAction(db, userId, "parse_cv", model, credentials);
  return extractCvFromUrl(input.cvUrl, model, credentials);
}

export async function saveCriteria(db: Database, criteriaData: SaveCriteriaInput, userId: string) {
  // Deactivate only this user's existing criteria before saving new record
  await deactivateUserCriteria(db, userId);
  return insertCriteria(db, { ...criteriaData, userId });
}
