import { z } from "zod";
import { getJobsSchema, jobSortSchema } from "@/jobs/jobs.validators";

/**
 * The part of a jobs query a view remembers.
 *
 * Picked from getJobsSchema rather than restated, so a filter added to the list
 * is a filter a view can hold without a second definition drifting out of date.
 *
 * bucketId is deliberately not in here: the bucket bar is a separate axis, and a
 * view that silently jumped you into another hunt would be the most confusing
 * thing on the page. Paging fields are excluded for the obvious reason — a view
 * is a question, not a position in the answer.
 */
export const savedViewFiltersSchema = getJobsSchema
  .pick({
    statuses: true,
    sources: true,
    workTypes: true,
    isRemote: true,
    minScore: true,
    postedWithinDays: true,
    search: true,
    sort: true,
    seniorities: true,
    remotePolicies: true,
    minAnnualSalary: true,
  })
  .partial()
  // .partial() makes a field optional but leaves its .default() in place, so the
  // picked `sort` would resolve to "score" on every parse — stamping a sort onto
  // views that never chose one, and making an empty filter set impossible to
  // recognise. Restating it as a plain optional is what actually removes it.
  .extend({ sort: jobSortSchema.optional() });

export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;

// Long enough to be descriptive, short enough to render as a tab.
const MAX_VIEW_NAME_LENGTH = 40;
// Past this the tab strip is the page. A view you can't find is not a shortcut.
export const MAX_SAVED_VIEWS = 12;

export const createSavedViewSchema = z.object({
  name: z.string().trim().min(1, "Give the view a name").max(MAX_VIEW_NAME_LENGTH),
  filters: savedViewFiltersSchema,
});

export const updateSavedViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(MAX_VIEW_NAME_LENGTH).optional(),
  // Sent whole rather than merged: "update this view to what I'm looking at now"
  // has to be able to remove a filter, and a partial merge never can.
  filters: savedViewFiltersSchema.optional(),
});

export const deleteSavedViewSchema = z.object({
  id: z.string().min(1),
});

export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;
export type UpdateSavedViewInput = z.infer<typeof updateSavedViewSchema>;
export type DeleteSavedViewInput = z.infer<typeof deleteSavedViewSchema>;
