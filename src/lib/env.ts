import { z } from "zod";

// ─── Server-only env vars ─────────────────────────────────────────────────────
// Import this only in server files (routers, services, lib clients)

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APIFY_API_TOKEN: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(), // optional — only needed for direct gpt-* models
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// ─── Client-safe env vars ─────────────────────────────────────────────────────
// Import this in client components — only NEXT_PUBLIC_ vars

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

function validateEnv<T extends z.ZodTypeAny>(schema: T, values: Record<string, string | undefined>): z.infer<T> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check your .env.local file.");
  }
  return parsed.data;
}

export const env = typeof window === "undefined"
  ? validateEnv(serverEnvSchema, process.env as Record<string, string | undefined>)
  : validateEnv(clientEnvSchema, {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    }) as z.infer<typeof serverEnvSchema>;

export const clientEnv = validateEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
