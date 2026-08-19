import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";
import { maskSecret } from "@/utils/mask-secret";
import { getSettingsByUserId, upsertUserSettings } from "./settings.db";
import type {
  UpdateDigestInput,
  UpdateTelegramInput,
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

  const { apifyApiToken, scrapingProxyApiKey, telegramBotToken, ...safeSettings } = settings;

  return {
    ...safeSettings,
    hasApifyApiToken: Boolean(apifyApiToken),
    apifyApiTokenPreview: apifyApiToken ? maskSecret(apifyApiToken) : null,
    hasScrapingProxyApiKey: Boolean(scrapingProxyApiKey),
    hasTelegramBotToken: Boolean(telegramBotToken),
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

export async function updateDigest(db: Database, userId: string, input: UpdateDigestInput) {
  await upsertUserSettings(db, userId, {
    ...(input.dailyDigestEnabled !== undefined
      ? { dailyDigestEnabled: input.dailyDigestEnabled }
      : {}),
    ...(input.digestChannels !== undefined ? { digestChannels: input.digestChannels } : {}),
  });
  return getUserSettings(db, userId);
}

/**
 * Saves Telegram credentials and proves they work before storing them.
 *
 * Sending a test message first is the difference between finding out now and
 * finding out at 6am tomorrow when nothing arrives. "chat not found" — the usual
 * mistake, from never having messaged the bot — is reported as itself.
 */
export async function connectTelegram(db: Database, userId: string, input: UpdateTelegramInput) {
  const botToken = input.telegramBotToken?.trim();
  const chatId = input.telegramChatId?.trim();

  if (!botToken || !chatId) {
    await upsertUserSettings(db, userId, { telegramBotToken: null, telegramChatId: null });
    return getUserSettings(db, userId);
  }

  try {
    await sendTelegramMessage(
      { botToken, chatId },
      "<b>AI Job Hunter</b> is connected. Your daily digest will arrive here.",
    );
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Couldn't reach Telegram.",
    });
  }

  await upsertUserSettings(db, userId, { telegramBotToken: botToken, telegramChatId: chatId });
  return getUserSettings(db, userId);
}

export async function updateJobSources(db: Database, userId: string, input: UpdateJobSourcesInput) {
  await upsertUserSettings(db, userId, {
    jobSources: input.jobSources,
  });
  return getUserSettings(db, userId);
}
