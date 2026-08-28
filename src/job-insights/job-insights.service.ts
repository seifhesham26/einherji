import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { extractJobFacts } from "@/lib/ai/extract-job-facts";
import { writeFitReport } from "@/lib/ai/write-fit-report";
import { AiResponseError } from "@/lib/ai/parse-json-response";
import type { AiCredentials } from "@/lib/ai/resolve-ai-client";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getSettingsByUserId } from "@/settings/settings.db";
import { getJobById } from "@/jobs/jobs.db";
import { consumeQuota } from "@/usage/usage.service";
import { DEFAULT_MODEL } from "@/criteria/criteria.validators";
import {
  countJobsAwaitingExtraction,
  getFitReport,
  getJobsAwaitingExtraction,
  saveJobFacts,
  upsertFitReport,
} from "./job-insights.db";
import { toJobFactsUpdate } from "./to-job-facts-update";
import type {
  ExtractJobFactsInput,
  ExtractManyJobFactsInput,
  FitRequirement,
  GenerateFitReportInput,
  GetFitReportInput,
} from "./job-insights.validators";

// Below this a description is a stub — a title repeated, or "See our careers
// page" — and extracting from it spends a completion to learn nothing.
const MIN_DESCRIPTION_LENGTH = 200;

/**
 * The account's own AI keys, or nothing.
 *
 * Nothing means the server key pays, which is the right answer for a single-user
 * install and the wrong one the moment a second person signs up. Resolved once
 * per request rather than read inside the client, so it is obvious at every call
 * site whose bill this is.
 */
async function resolveAiContext(db: Database, userId: string) {
  const [activeCriteria, settings] = await Promise.all([
    getActiveCriteria(db, userId),
    getSettingsByUserId(db, userId),
  ]);

  const credentials: AiCredentials = {
    openrouterApiKey: settings?.openrouterApiKey ?? null,
    openaiApiKey: settings?.openaiApiKey ?? null,
  };

  return { activeCriteria, credentials, model: activeCriteria?.model ?? DEFAULT_MODEL };
}

export async function analyseJob(db: Database, userId: string, input: ExtractJobFactsInput) {
  const job = await getJobById(db, userId, input.jobId);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  if (!job.description || job.description.length < MIN_DESCRIPTION_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "This posting has no description to read — the source didn't include one. Open the posting instead.",
    });
  }

  // Charged before the call, not after: a completion that errors partway can
  // still have been billed by the provider.
  await consumeQuota(db, userId, "extract_job_facts");

  const { credentials, model } = await resolveAiContext(db, userId);

  const facts = await extractJobFacts({
    model,
    title: job.title,
    company: job.company,
    location: job.location,
    salaryText: job.salary,
    description: job.description,
    credentials,
  }).catch(rethrowAsUserFacing);

  await saveJobFacts(db, userId, job.id, toJobFactsUpdate(facts));

  return { jobId: job.id, facts };
}

/**
 * Works through the backlog of unread postings.
 *
 * Sequential, and capped by the input schema. Each job is a completion of
 * several seconds and the whole thing runs inside the request that started it —
 * the same constraint the scrape has, and the same eventual fix (the queue in
 * phase 5).
 *
 * One job failing doesn't sink the batch. A model that can't parse one posting
 * is a normal outcome, and losing the nine that worked because the tenth didn't
 * would make the button useless on exactly the accounts that need it.
 */
export async function analyseJobBacklog(
  db: Database,
  userId: string,
  input: ExtractManyJobFactsInput,
) {
  const pending = await getJobsAwaitingExtraction(db, userId, input.limit, input.bucketId);

  if (pending.length === 0) {
    return { analysedCount: 0, failedCount: 0, remaining: 0 };
  }

  const { credentials, model } = await resolveAiContext(db, userId);

  let analysedCount = 0;
  let failedCount = 0;

  for (const job of pending) {
    // Charged per job. The quota is what stops a backlog of two thousand
    // postings becoming two thousand completions in an afternoon.
    await consumeQuota(db, userId, "extract_job_facts");

    try {
      const facts = await extractJobFacts({
        model,
        title: job.title,
        company: job.company,
        location: job.location,
        salaryText: job.salary,
        description: job.description ?? "",
        credentials,
      });

      await saveJobFacts(db, userId, job.id, toJobFactsUpdate(facts));
      analysedCount++;
    } catch {
      // Left unmarked on purpose, so a later run picks it up again. Marking it
      // read would hide a posting that a better model could handle.
      failedCount++;
    }
  }

  const remaining = await countJobsAwaitingExtraction(db, userId, input.bucketId);

  return { analysedCount, failedCount, remaining };
}

export async function fetchExtractionBacklog(db: Database, userId: string, bucketId?: string) {
  return { remaining: await countJobsAwaitingExtraction(db, userId, bucketId) };
}

export async function fetchFitReport(db: Database, userId: string, input: GetFitReportInput) {
  const report = await getFitReport(db, userId, input.jobId);
  if (!report) return null;

  return { ...report, requirements: report.requirements as FitRequirement[] };
}

/**
 * Judges a posting against the CV.
 *
 * A stored report is returned untouched unless the caller asks for a new one, so
 * opening the same job twice doesn't spend two completions on the same answer.
 */
export async function judgeJobFit(db: Database, userId: string, input: GenerateFitReportInput) {
  if (!input.regenerate) {
    const existing = await getFitReport(db, userId, input.jobId);
    if (existing) {
      return { ...existing, requirements: existing.requirements as FitRequirement[] };
    }
  }

  const job = await getJobById(db, userId, input.jobId);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  if (!job.description || job.description.length < MIN_DESCRIPTION_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "There's no description to judge against — the source didn't include one. Open the posting instead.",
    });
  }

  const { activeCriteria, credentials, model } = await resolveAiContext(db, userId);
  const resumeText = activeCriteria?.resumeText?.trim();

  // Checked before the quota is charged: without a CV there is nothing to
  // compare the posting to, and the completion would be spent on an answer built
  // from nothing.
  if (!resumeText) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "There's no CV to compare against yet. Add one in Criteria — upload a file or paste the text.",
    });
  }

  await consumeQuota(db, userId, "generate_fit_report");

  const report = await writeFitReport({
    model,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    resumeText,
    skills: activeCriteria?.skills ?? [],
    credentials,
  }).catch(rethrowAsUserFacing);

  const saved = await upsertFitReport(db, userId, job.id, { ...report, model });

  return { ...saved, requirements: report.requirements };
}

/**
 * Turns a mangled model reply into something the UI can show.
 *
 * A malformed answer is the model's fault, not the server's, and it has an
 * action attached — try again, or switch model — so it reads as a bad request
 * rather than an outage. Everything else is left to bubble to Sentry.
 */
function rethrowAsUserFacing(error: unknown): never {
  if (error instanceof AiResponseError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
}
