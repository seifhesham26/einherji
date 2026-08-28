import { z } from "zod";

// ─── Vocabulary ───────────────────────────────────────────────────────────────
// Mirrors seniorityLevelEnum and remotePolicyEnum in the schema.

export const seniorityLevelValues = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "lead",
  "unknown",
] as const;

export const seniorityLevelSchema = z.enum(seniorityLevelValues);
export type SeniorityLevel = z.infer<typeof seniorityLevelSchema>;

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  lead: "Lead",
  unknown: "Not stated",
};

export const remotePolicyValues = ["remote", "hybrid", "onsite", "unknown"] as const;
export const remotePolicySchema = z.enum(remotePolicyValues);
export type RemotePolicy = z.infer<typeof remotePolicySchema>;

export const REMOTE_POLICY_LABELS: Record<RemotePolicy, string> = {
  remote: "Fully remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "Not stated",
};

export const salaryPeriodValues = ["year", "month", "week", "day", "hour"] as const;
export const salaryPeriodSchema = z.enum(salaryPeriodValues);

// ─── What the model must return ───────────────────────────────────────────────
// These are contracts with a language model, not with a caller, so every field
// is explicitly nullable: "the posting didn't say" is a real and common answer,
// and a schema that can't express it pushes the model into inventing one.

// Long enough for "Kubernetes", short enough that a sentence can't get in.
const MAX_TECH_NAME_LENGTH = 40;
const MAX_TECH_STACK_SIZE = 30;

export const extractedJobFactsSchema = z.object({
  seniority: seniorityLevelSchema,
  yearsExperienceMin: z.number().int().min(0).max(50).nullable(),
  techStack: z.array(z.string().trim().min(1).max(MAX_TECH_NAME_LENGTH)).max(MAX_TECH_STACK_SIZE),
  // The number and its period, never the annual figure. The multiplication is
  // done in annualise-salary.ts, where it can be tested — a model that silently
  // multiplies by twelve is a model whose arithmetic you cannot check.
  salary: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string().nullable(),
      period: salaryPeriodSchema.nullable(),
    })
    .nullable(),
  remotePolicy: remotePolicySchema,
  offersVisaSponsorship: z.boolean().nullable(),
  // ISO 639-1, so "en" / "ar". Loosely bounded because the model occasionally
  // answers "en-GB", which is still useful.
  language: z.string().trim().min(2).max(5).nullable(),
});

export type ExtractedJobFacts = z.infer<typeof extractedJobFactsSchema>;

export const fitVerdictValues = ["met", "partial", "missing"] as const;
export const fitVerdictSchema = z.enum(fitVerdictValues);
export type FitVerdict = z.infer<typeof fitVerdictSchema>;

export const FIT_VERDICT_LABELS: Record<FitVerdict, string> = {
  met: "Met",
  partial: "Partly met",
  missing: "Missing",
};

const MAX_REQUIREMENTS = 12;
const MAX_LIST_ITEMS = 5;

export const fitRequirementSchema = z.object({
  requirement: z.string().trim().min(1).max(200),
  verdict: fitVerdictSchema,
  // Which line of the CV backs the verdict up. The single thing that separates a
  // fit report from a number you have no reason to believe.
  evidence: z.string().trim().max(400),
});

export type FitRequirement = z.infer<typeof fitRequirementSchema>;

export const fitReportSchema = z.object({
  matchPercent: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(600),
  requirements: z.array(fitRequirementSchema).min(1).max(MAX_REQUIREMENTS),
  gaps: z.array(z.string().trim().min(1).max(200)).max(MAX_LIST_ITEMS),
  emphasise: z.array(z.string().trim().min(1).max(200)).max(MAX_LIST_ITEMS),
});

export type FitReport = z.infer<typeof fitReportSchema>;

// ─── Procedure inputs ─────────────────────────────────────────────────────────

export const extractJobFactsSchema = z.object({
  jobId: z.string().min(1),
});

// Each job in a batch costs a completion and several seconds, and the whole
// thing runs inside the request that started it. Ten is roughly what fits in a
// serverless invocation without gambling on the timeout.
export const MAX_EXTRACTION_BATCH = 10;

export const extractManyJobFactsSchema = z.object({
  bucketId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(MAX_EXTRACTION_BATCH).default(MAX_EXTRACTION_BATCH),
});

export const generateFitReportSchema = z.object({
  jobId: z.string().min(1),
  // A stored report is returned as-is unless this says otherwise, so opening the
  // same job twice doesn't spend two completions.
  regenerate: z.boolean().default(false),
});

export const getFitReportSchema = z.object({
  jobId: z.string().min(1),
});

export type ExtractJobFactsInput = z.infer<typeof extractJobFactsSchema>;
export type ExtractManyJobFactsInput = z.infer<typeof extractManyJobFactsSchema>;
export type GenerateFitReportInput = z.infer<typeof generateFitReportSchema>;
export type GetFitReportInput = z.infer<typeof getFitReportSchema>;
