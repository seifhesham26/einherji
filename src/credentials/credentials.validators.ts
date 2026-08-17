import { z } from "zod";
import { jobSourceNameSchema } from "@/lib/scrapers/job-source.types";

export const saveCredentialsSchema = z.object({
  source: jobSourceNameSchema,
  // Shape varies per source, so the registry — not this schema — decides which
  // keys are required. Values are trimmed and empty ones dropped in the service.
  credentials: z.record(z.string(), z.string()),
});

export const deleteCredentialsSchema = z.object({
  source: jobSourceNameSchema,
});

export type SaveCredentialsInput = z.infer<typeof saveCredentialsSchema>;
export type DeleteCredentialsInput = z.infer<typeof deleteCredentialsSchema>;

// What the client is allowed to see. Never the secret itself — the raw value
// would otherwise sit in the browser's query cache.
export interface CredentialStatus {
  source: string;
  isConfigured: boolean;
  maskedValues: Record<string, string>;
  updatedAt: Date | null;
}
