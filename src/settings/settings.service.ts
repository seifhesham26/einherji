import type { Database } from "@/lib/db";
import { getSettingsByUserId, upsertUserSettings } from "./settings.db";
import type { UpdateIntegrationsInput, UpdateProfileInput } from "./settings.validators";

export async function getUserSettings(db: Database, userId: string) {
  return getSettingsByUserId(db, userId);
}

export async function updateProfile(db: Database, userId: string, input: UpdateProfileInput) {
  return upsertUserSettings(db, userId, {
    jobTitle: input.jobTitle,
    linkedinUrl: input.linkedinUrl,
  });
}

export async function updateIntegrations(db: Database, userId: string, input: UpdateIntegrationsInput) {
  return upsertUserSettings(db, userId, {
    apifyApiToken: input.apifyApiToken,
  });
}
