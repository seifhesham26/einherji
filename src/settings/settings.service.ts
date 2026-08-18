import type { Database } from "@/lib/db";
import { maskSecret } from "@/utils/mask-secret";
import { getSettingsByUserId, upsertUserSettings } from "./settings.db";
import type {
  UpdateIntegrationsInput,
  UpdateJobSourcesInput,
  UpdateProfileInput,
} from "./settings.validators";

/**
 * Settings as the browser is allowed to see them.
 *
 * The raw Apify token used to be returned here, which put it in TanStack Query's
 * cache and in the React tree — readable from devtools, and persisted by any
 * cache that writes to storage. The server reads the real value straight from
 * settings.db when it needs it; the client only ever needs to know whether one
 * is saved and which.
 */
export async function getUserSettings(db: Database, userId: string) {
  const settings = await getSettingsByUserId(db, userId);
  if (!settings) return null;

  const { apifyApiToken, scrapingProxyApiKey, ...safeSettings } = settings;

  return {
    ...safeSettings,
    hasApifyApiToken: Boolean(apifyApiToken),
    apifyApiTokenPreview: apifyApiToken ? maskSecret(apifyApiToken) : null,
    hasScrapingProxyApiKey: Boolean(scrapingProxyApiKey),
  };
}

export async function updateProfile(db: Database, userId: string, input: UpdateProfileInput) {
  await upsertUserSettings(db, userId, {
    jobTitle: input.jobTitle,
    linkedinUrl: input.linkedinUrl,
  });
  return getUserSettings(db, userId);
}

export async function updateIntegrations(db: Database, userId: string, input: UpdateIntegrationsInput) {
  const submittedToken = input.apifyApiToken?.trim();

  // Blank means "leave it as it is", not "delete it". The form can no longer
  // pre-fill the saved token — it never reaches the browser — so submitting the
  // page after editing something else would otherwise silently wipe the key.
  // Removing one is deliberate, via disconnectApify.
  if (submittedToken) {
    await upsertUserSettings(db, userId, { apifyApiToken: submittedToken });
  }

  // Re-read through the same filter the client already uses, so a mutation
  // response can't become a second way to leak the token.
  return getUserSettings(db, userId);
}

export async function disconnectApify(db: Database, userId: string) {
  await upsertUserSettings(db, userId, { apifyApiToken: null });
  return getUserSettings(db, userId);
}

export async function updateJobSources(db: Database, userId: string, input: UpdateJobSourcesInput) {
  await upsertUserSettings(db, userId, {
    jobSources: input.jobSources,
  });
  return getUserSettings(db, userId);
}
