import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { getSourceDefinition } from "@/lib/scrapers/source-registry";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";
import {
  deleteCredentials,
  getAllCredentials,
  getCredentialsForSource,
  upsertCredentials,
} from "./credentials.db";
import type {
  CredentialStatus,
  DeleteCredentialsInput,
  SaveCredentialsInput,
} from "./credentials.validators";

/**
 * Returns which sources are configured, with masked previews.
 *
 * Deliberately never returns the raw secret: settings.get already leaks the Apify
 * token into the browser's query cache (AUDIT.md M10) and there's no reason to
 * repeat that here.
 */
export async function fetchCredentialStatuses(
  db: Database,
  userId: string,
): Promise<CredentialStatus[]> {
  const rows = await getAllCredentials(db, userId);

  return rows.map((row) => ({
    source: row.source,
    isConfigured: Object.keys(row.credentials ?? {}).length > 0,
    maskedValues: maskCredentials(row.source, row.credentials ?? {}),
    updatedAt: row.updatedAt,
  }));
}

export async function saveSourceCredentials(
  db: Database,
  userId: string,
  input: SaveCredentialsInput,
) {
  const definition = getSourceDefinition(input.source);
  if (!definition) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown source" });
  }
  if (definition.credentialFields.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${definition.name} doesn't need credentials.`,
    });
  }

  // Drop blanks so a half-filled form doesn't store empty strings that later
  // read as "configured".
  const cleaned = Object.fromEntries(
    Object.entries(input.credentials)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0),
  );

  const missingFields = definition.credentialFields
    .filter((field) => !cleaned[field.key])
    .map((field) => field.label);

  if (missingFields.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Missing ${missingFields.join(" and ")} for ${definition.name}.`,
    });
  }

  const saved = await upsertCredentials(db, userId, input.source, cleaned);

  return {
    source: saved.source,
    isConfigured: true,
    maskedValues: maskCredentials(saved.source, cleaned),
    updatedAt: saved.updatedAt,
  } satisfies CredentialStatus;
}

export async function removeSourceCredentials(
  db: Database,
  userId: string,
  input: DeleteCredentialsInput,
) {
  const deleted = await deleteCredentials(db, userId, input.source);
  if (!deleted) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No credentials saved for that source" });
  }
  return { source: deleted.source };
}

// Used by the scrape orchestrator, which does need the real values.
export async function resolveCredentials(
  db: Database,
  userId: string,
  source: JobSourceName,
): Promise<Record<string, string> | null> {
  const row = await getCredentialsForSource(db, userId, source);
  return row?.credentials ?? null;
}

const VISIBLE_SUFFIX_LENGTH = 4;

function maskCredentials(
  source: string,
  credentials: Record<string, string>,
): Record<string, string> {
  const definition = getSourceDefinition(source as JobSourceName);

  return Object.fromEntries(
    Object.entries(credentials).map(([key, value]) => {
      const field = definition?.credentialFields.find((candidate) => candidate.key === key);
      // Non-secret fields (an app id) are safe to show in full and are useful for
      // confirming the right account is connected.
      if (field && !field.isSecret) return [key, value];
      return [key, maskValue(value)];
    }),
  );
}

function maskValue(value: string): string {
  if (value.length <= VISIBLE_SUFFIX_LENGTH) return "••••";
  return `••••${value.slice(-VISIBLE_SUFFIX_LENGTH)}`;
}
