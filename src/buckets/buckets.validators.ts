import { z } from "zod";
import { jobSourceNameSchema } from "@/lib/scrapers/job-source.types";

export const bucketKindValues = ["jobs", "clients", "suppliers", "custom"] as const;
export const bucketKindSchema = z.enum(bucketKindValues);

// The fields themselves, with no defaults attached. Create and update each apply
// their own, because they need opposite behaviour for an omitted key.
const bucketFieldsSchema = z.object({
  name: z.string().trim().min(1, "Give the bucket a name").max(80),
  kind: bucketKindSchema,
  keywords: z.array(z.string().trim().min(1)).max(30),
  locations: z.array(z.string().trim().min(1)).max(30),
  sources: z.array(jobSourceNameSchema).max(30),
  pitch: z.string().trim().max(2000).optional(),
});

export const createBucketSchema = bucketFieldsSchema.extend({
  kind: bucketKindSchema.default("jobs"),
  keywords: z.array(z.string().trim().min(1)).max(30).default([]),
  locations: z.array(z.string().trim().min(1)).max(30).default([]),
  sources: z.array(jobSourceNameSchema).max(30).default([]),
});

/**
 * A partial change to one bucket. Every field is optional and *none* defaults.
 *
 * Built from the undefaulted fields rather than `createBucketSchema.partial()`,
 * which reads as though it would leave an omitted key absent and does not: Zod
 * applies a wrapped `.default()` even under `.partial()`, so parsing
 * `{ id, name }` against that schema yields keywords, locations and sources as
 * empty arrays and kind reset to "jobs". Renaming a bucket would have silently
 * erased its entire search.
 */
export const updateBucketSchema = bucketFieldsSchema.partial().extend({
  id: z.string().min(1),
  isArchived: z.boolean().optional(),
});

export const bucketIdSchema = z.object({ id: z.string().min(1) });

export type BucketKind = z.infer<typeof bucketKindSchema>;
export type CreateBucketInput = z.infer<typeof createBucketSchema>;
export type UpdateBucketInput = z.infer<typeof updateBucketSchema>;

/**
 * What each kind of hunt is for, and which sources actually serve it.
 *
 * Kept beside the schema because it's what the UI needs to explain a bucket
 * before the user has filled anything in — and because two of the four have
 * honest limits worth stating up front rather than discovering later.
 */
export const BUCKET_KIND_PRESETS: Record<
  BucketKind,
  { label: string; description: string; sources: string[]; note?: string }
> = {
  jobs: {
    label: "Jobs for me",
    description: "Roles you'd apply to yourself.",
    sources: ["greenhouse", "lever", "ashby", "workable", "remoteok", "arbeitnow", "jobicy"],
  },
  clients: {
    label: "Clients for us",
    description:
      "Businesses that might buy what you build. A company advertising developer roles has a software need and a budget.",
    sources: ["freelancer", "hackernews_freelance", "remoteok", "arbeitnow", "greenhouse", "lever"],
  },
  suppliers: {
    label: "Suppliers",
    description: "Businesses you want to buy from.",
    sources: [],
    note: "No automated source. Facebook and most supplier directories prohibit automated collection, so add these by hand.",
  },
  custom: {
    label: "Something else",
    description: "Your own keywords against whichever sources you pick.",
    sources: [],
  },
};
