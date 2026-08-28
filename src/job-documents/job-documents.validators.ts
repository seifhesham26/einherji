import { z } from "zod";

// Mirrors jobDocumentKindEnum in the schema.
export const jobDocumentKindValues = [
  "cover_letter",
  "application_answer",
  "cv_bullets",
  "interview_prep",
] as const;

export const jobDocumentKindSchema = z.enum(jobDocumentKindValues);
export type JobDocumentKind = z.infer<typeof jobDocumentKindSchema>;

export const JOB_DOCUMENT_LABELS: Record<JobDocumentKind, string> = {
  cover_letter: "Cover letter",
  application_answer: "Application answer",
  cv_bullets: "Tailored CV bullets",
  interview_prep: "Interview prep",
};

export const JOB_DOCUMENT_DESCRIPTIONS: Record<JobDocumentKind, string> = {
  cover_letter: "A letter for this posting, in your own experience.",
  application_answer: "An answer to one of the form's questions.",
  cv_bullets: "Your existing bullets, pointed at this description.",
  interview_prep: "Likely questions and a short brief on the company.",
};

/** The only kind that needs a question from the user — the rest carry a fixed brief. */
export const KINDS_NEEDING_A_PROMPT: JobDocumentKind[] = ["application_answer"];

// Long enough for a multi-part essay question, short enough that a whole job
// description can't be pasted in as "the question".
const MAX_PROMPT_LENGTH = 600;

export const generateJobDocumentSchema = z
  .object({
    jobId: z.string().min(1),
    kind: jobDocumentKindSchema,
    // The application's own question, for an answer.
    prompt: z.string().trim().max(MAX_PROMPT_LENGTH).optional(),
  })
  // Checked here rather than in the service: an answer with no question is a
  // malformed request, not a business rule, and the model would otherwise be
  // asked to answer nothing and would happily oblige.
  .refine(
    (input) => !KINDS_NEEDING_A_PROMPT.includes(input.kind) || Boolean(input.prompt?.length),
    { message: "Paste the question you're answering.", path: ["prompt"] },
  );

export const getJobDocumentsSchema = z.object({
  jobId: z.string().min(1),
});

export const deleteJobDocumentSchema = z.object({
  id: z.string().min(1),
});

export type GenerateJobDocumentInput = z.infer<typeof generateJobDocumentSchema>;
export type GetJobDocumentsInput = z.infer<typeof getJobDocumentsSchema>;
export type DeleteJobDocumentInput = z.infer<typeof deleteJobDocumentSchema>;
