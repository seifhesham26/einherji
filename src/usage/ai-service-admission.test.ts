import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";

const mocks = vi.hoisted(() => ({
  admit: vi.fn(), quota: vi.fn(), cv: vi.fn(), facts: vi.fn(), fit: vi.fn(), document: vi.fn(),
  job: vi.fn(), criteria: vi.fn(), settings: vi.fn(), report: vi.fn(), pending: vi.fn(), save: vi.fn(),
}));
vi.mock("./ai-admission", () => ({ admitAiAction: mocks.admit }));
vi.mock("./usage.service", () => ({ consumeQuota: mocks.quota }));
vi.mock("@/lib/cv-parser", () => ({ extractCvFromUrl: mocks.cv }));
vi.mock("@/lib/ai/extract-job-facts", () => ({ extractJobFacts: mocks.facts }));
vi.mock("@/lib/ai/write-fit-report", () => ({ writeFitReport: mocks.fit }));
vi.mock("@/lib/ai/write-job-document", () => ({ writeJobDocument: mocks.document }));
vi.mock("@/jobs/jobs.db", () => ({ getJobById: mocks.job }));
vi.mock("@/criteria/criteria.db", () => ({ getActiveCriteria: mocks.criteria, deactivateUserCriteria: vi.fn(), insertCriteria: vi.fn() }));
vi.mock("@/settings/settings.db", () => ({ getSettingsByUserId: mocks.settings }));
vi.mock("@/job-insights/job-insights.db", () => ({
  getFitReport: mocks.report, getJobsAwaitingExtraction: mocks.pending, saveJobFacts: mocks.save,
  upsertFitReport: mocks.save, countJobsAwaitingExtraction: vi.fn(async () => 0),
}));
vi.mock("@/job-documents/job-documents.db", () => ({ insertJobDocument: mocks.save, deleteJobDocument: vi.fn(), getJobDocuments: vi.fn() }));

import { extractCv } from "@/criteria/criteria.service";
import { analyseJob, analyseJobBacklog, judgeJobFit } from "@/job-insights/job-insights.service";
import { generateJobDocument } from "@/job-documents/job-documents.service";

const db = {} as Database;
const calls = [
  ["parse_cv", () => extractCv(db, "account-a", { cvUrl: "https://files.example/cv.pdf", model: "test" }), mocks.cv],
  ["extract_job_facts", () => analyseJob(db, "account-a", { jobId: "job-a" }), mocks.facts],
  ["extract_job_facts", () => analyseJobBacklog(db, "account-a", { limit: 1 }), mocks.facts],
  ["generate_fit_report", () => judgeJobFit(db, "account-a", { jobId: "job-a", regenerate: true }), mocks.fit],
  ["generate_document", () => generateJobDocument(db, "account-a", { jobId: "job-a", kind: "cover_letter" }), mocks.document],
] as const;

describe("AI services enforce funding admission", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.admit.mockRejectedValue(new Error("Funding denied"));
    mocks.quota.mockResolvedValue(undefined);
    const job = { id: "job-a", title: "Developer", company: "Example", description: "A".repeat(300) };
    mocks.job.mockResolvedValue(job);
    mocks.pending.mockResolvedValue([job]);
    mocks.criteria.mockResolvedValue({ model: "test", resumeText: "CV", skills: [] });
    mocks.settings.mockResolvedValue({ openrouterApiKey: "personal", openaiApiKey: null });
    mocks.report.mockResolvedValue(null);
  });

  it.each(calls)("checks %s funding before provider work", async (action, call, provider) => {
    await expect(call()).rejects.toThrow("Funding denied");
    expect(mocks.admit).toHaveBeenCalledWith(db, "account-a", action, "test", { openrouterApiKey: "personal", openaiApiKey: null });
    expect(provider).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.quota).not.toHaveBeenCalled();
  });

  it("returns a saved fit report without funding admission", async () => {
    const report = { id: "report-a", requirements: [] };
    mocks.report.mockResolvedValue(report);
    await expect(judgeJobFit(db, "account-a", { jobId: "job-a", regenerate: false })).resolves.toEqual(report);
    expect(mocks.admit).not.toHaveBeenCalled();
  });

  it.each([
    () => analyseJob(db, "account-a", { jobId: "job-a" }),
    () => judgeJobFit(db, "account-a", { jobId: "job-a", regenerate: true }),
    () => generateJobDocument(db, "account-a", { jobId: "job-a", kind: "cover_letter" }),
  ])("does not admit another account's missing job", async (call) => {
    mocks.job.mockResolvedValue(null);
    await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.admit).not.toHaveBeenCalled();
    expect(mocks.quota).not.toHaveBeenCalled();
  });
});
