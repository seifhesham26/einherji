import OpenAI from "openai";
import { env } from "@/lib/env";

/**
 * Which account's key pays for a completion.
 *
 * Every other third-party key in this app is per-account and encrypted at rest.
 * The AI keys were the exception: one server-wide key billed for everyone, which
 * works exactly until a second person logs in and then silently doesn't. The
 * server key stays as the fallback — it is the right answer for a single-user
 * install — but an account that supplies its own now pays its own bill.
 */

export interface AiCredentials {
  openrouterApiKey?: string | null;
  openaiApiKey?: string | null;
}

// Models that go straight to OpenAI when a key for it exists. Everything else
// goes through OpenRouter, which fronts them all under one key.
const OPENAI_MODEL_PREFIXES = ["gpt-", "o1-", "o3-", "o4-"];

function isOpenAIModel(model: string): boolean {
  return OPENAI_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

// An OpenAI client is a thin wrapper around fetch, but it is built on every
// completion and there are only ever a handful of distinct keys in play. Cached
// by the key itself so two accounts never share one.
const clientCache = new Map<string, OpenAI>();

function openRouterClient(apiKey: string): OpenAI {
  const cacheKey = `openrouter:${apiKey}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
      "X-Title": "Einherji",
    },
  });

  clientCache.set(cacheKey, client);
  return client;
}

function directOpenAIClient(apiKey: string): OpenAI {
  const cacheKey = `openai:${apiKey}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = new OpenAI({ apiKey });
  clientCache.set(cacheKey, client);
  return client;
}

/**
 * The client to run this model through, for this account.
 *
 * A gpt-* model prefers a direct OpenAI key when one is available — it is
 * cheaper than the same model through OpenRouter — and otherwise falls back to
 * OpenRouter, which carries them too.
 */
export function resolveAiClient(model: string, credentials: AiCredentials = {}): OpenAI {
  const openaiKey = credentials.openaiApiKey?.trim() || env.OPENAI_API_KEY;
  if (isOpenAIModel(model) && openaiKey) return directOpenAIClient(openaiKey);

  const openrouterKey = credentials.openrouterApiKey?.trim() || env.OPENROUTER_API_KEY;
  return openRouterClient(openrouterKey);
}

/** Test seam — the cache is keyed by secret, so it must be clearable. */
export function resetAiClientCache(): void {
  clientCache.clear();
}
