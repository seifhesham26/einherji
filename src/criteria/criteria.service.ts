import type { Database } from "@/lib/db";
import { deactivateUserCriteria, getActiveCriteria, insertCriteria } from "./criteria.db";
import type { SaveCriteriaInput } from "./criteria.validators";

export async function fetchActiveCriteria(db: Database, userId: string) {
  return getActiveCriteria(db, userId);
}

export async function saveCriteria(db: Database, criteriaData: SaveCriteriaInput, userId: string) {
  // Deactivate only this user's existing criteria before saving new record
  await deactivateUserCriteria(db, userId);
  return insertCriteria(db, { ...criteriaData, userId });
}
