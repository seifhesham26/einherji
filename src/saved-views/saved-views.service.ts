import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { isUniqueViolation } from "@/utils/is-unique-violation";
import {
  countSavedViews,
  deleteSavedView,
  getSavedViews,
  insertSavedView,
  updateSavedView,
} from "./saved-views.db";
import {
  MAX_SAVED_VIEWS,
  savedViewFiltersSchema,
  type CreateSavedViewInput,
  type DeleteSavedViewInput,
  type SavedViewFilters,
  type UpdateSavedViewInput,
} from "./saved-views.validators";

export interface SavedView {
  id: string;
  name: string;
  filters: SavedViewFilters;
  position: number;
}

/**
 * The user's views, with their filters parsed rather than trusted.
 *
 * The column is jsonb, so what comes back is whatever shape was valid when it
 * was written. A filter renamed in a later release would otherwise reach the
 * query builder as an unknown key. Anything that no longer parses falls back to
 * an empty filter set — the view still opens, showing everything, which is a far
 * better failure than a tab that throws when clicked.
 */
export async function fetchSavedViews(db: Database, userId: string): Promise<SavedView[]> {
  const rows = await getSavedViews(db, userId);

  return rows.map((row) => {
    const parsed = savedViewFiltersSchema.safeParse(row.filters);
    return {
      id: row.id,
      name: row.name,
      filters: parsed.success ? parsed.data : {},
      position: row.position,
    };
  });
}

export async function createSavedView(
  db: Database,
  userId: string,
  input: CreateSavedViewInput,
): Promise<SavedView> {
  const existingCount = await countSavedViews(db, userId);
  if (existingCount >= MAX_SAVED_VIEWS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `You can keep ${MAX_SAVED_VIEWS} views. Delete one to make room.`,
    });
  }

  // New views go on the end of the strip. Position is stored rather than derived
  // so reordering later doesn't have to rewrite what the list means.
  const inserted = await insertSavedView(db, userId, {
    name: input.name,
    filters: input.filters,
    position: existingCount,
  }).catch((error) => {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `You already have a view called "${input.name}".`,
      });
    }
    throw error;
  });

  if (!inserted) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save the view" });
  }

  return {
    id: inserted.id,
    name: inserted.name,
    filters: input.filters,
    position: inserted.position,
  };
}

export async function editSavedView(
  db: Database,
  userId: string,
  input: UpdateSavedViewInput,
): Promise<SavedView> {
  const updated = await updateSavedView(db, userId, input.id, {
    name: input.name,
    filters: input.filters,
  }).catch((error) => {
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `You already have a view called "${input.name}".`,
      });
    }
    throw error;
  });

  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });

  const parsed = savedViewFiltersSchema.safeParse(updated.filters);

  return {
    id: updated.id,
    name: updated.name,
    filters: parsed.success ? parsed.data : {},
    position: updated.position,
  };
}

export async function removeSavedView(
  db: Database,
  userId: string,
  input: DeleteSavedViewInput,
) {
  const deleted = await deleteSavedView(db, userId, input.id);
  if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "View not found" });
  return { id: deleted.id };
}
