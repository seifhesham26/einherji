import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { writeJobDocument } from "@/lib/ai/write-job-document";
import type { AiCredentials } from "@/lib/ai/resolve-ai-client";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getSettingsByUserId } from "@/settings/settings.db";
import { getJobById } from "@/jobs/jobs.db";
import { getFitReport } from "@/job-insights/job-insights.db";
import { consumeQuota } from "@/usage/usage.service";
import { DEFAULT_MODEL } from "@/criteria/criteria.validators";
import {
  deleteJobDocument,
  getJobDocuments,
  insertJobDocument,
} from "./job-documents.db";
import {
  JOB_DOCUMENT_LABELS,
  type DeleteJobDocumentInput,
  type GenerateJobDocumentInput,
  type GetJobDocumentsInput,
} from "./job-documents.validators";

export async function fetchJobDocuments(
  db: Database,
  userId: string,
  input: GetJobDocumentsInput,
) {
  return getJobDocuments(db, userId, input.jobId);
}

/**
 * Writes one document for one job.
 *
 * Everything the model needs is gathered here rather than in the prompt builder:
 * the posting, the CV, and — when one has already been run — what the fit report
 * decided is worth leading with. That last part is why the two features belong
 * together. The fit report has already worked out which parts of this CV answer
 * this description; making the cover letter guess at it again from scratch would
 * be paying twice for the same reasoning and getting a worse answer the second
 * time.
 */
export async function generateJobDocument(
  db: Database,
  userId: string,
  input: GenerateJobDocumentInput,
) {
  const job = await getJobById(db, userId, input.jobId);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  const [activeCriteria, settings, fitReport] = await Promise.all([
    getActiveCriteria(db, userId),
    getSettingsByUserId(db, userId),
    getFitReport(db, userId, job.id),
  ]);

  const resumeText = activeCriteria?.resumeText?.trim();

  // Checked before the quota is charged. Every one of these documents is the
  // candidate's own experience rewritten — without a CV the model has nothing to
  // work from and would write fiction, which is the one outcome with no defence.
  if (!resumeText) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A ${JOB_DOCUMENT_LABELS[input.kind].toLowerCase()} is your own experience, rewritten — add your CV in Criteria first.`,
    });
  }

  if (!job.description || job.description.trim().length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "This posting has no description, so there's nothing to write against. Open the posting and paste what it says into your notes, or try a job from another source.",
    });
  }

  await consumeQuota(db, userId, "generate_document");

  const model = activeCriteria?.model ?? DEFAULT_MODEL;
  const credentials: AiCredentials = {
    openrouterApiKey: settings?.openrouterApiKey ?? null,
    openaiApiKey: settings?.openaiApiKey ?? null,
  };

  const body = await writeJobDocument({
    kind: input.kind,
    model,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    resumeText,
    skills: activeCriteria?.skills ?? [],
    prompt: input.prompt,
    emphasise: fitReport?.emphasise ?? undefined,
    credentials,
  });

  if (body.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The model returned nothing. Try again, or pick a different model in Criteria.",
    });
  }

  return insertJobDocument(db, userId, {
    jobId: job.id,
    kind: input.kind,
    prompt: input.prompt ?? null,
    body,
    model,
  });
}

export async function removeJobDocument(
  db: Database,
  userId: string,
  input: DeleteJobDocumentInput,
) {
  const deleted = await deleteJobDocument(db, userId, input.id);
  if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
  return deleted;
}
