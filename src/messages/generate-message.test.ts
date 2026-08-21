import { beforeEach, describe, expect, it, vi } from "vitest";

// What the model is asked to write is decided entirely here, and getting it wrong
// is invisible until a supplier receives a cover letter. `bucket.pitch` was
// collected by the UI, stored, and read by nothing for the whole life of the
// feature — every message used the account's CV regardless of which hunt the
// contact belonged to.

const generateOutreachMessage = vi.fn();
const getLeadById = vi.fn();
const getBucketById = vi.fn();
const getActiveCriteria = vi.fn();
const getJobById = vi.fn();
const upsertDraftMessage = vi.fn();
const consumeQuota = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  generateOutreachMessage: (...args: unknown[]) => generateOutreachMessage(...args),
}));
vi.mock("@/leads/leads.db", () => ({
  getLeadById: (...args: unknown[]) => getLeadById(...args),
  setLeadMessageSent: vi.fn(),
}));
vi.mock("@/buckets/buckets.db", () => ({
  getBucketById: (...args: unknown[]) => getBucketById(...args),
}));
vi.mock("@/criteria/criteria.db", () => ({
  getActiveCriteria: (...args: unknown[]) => getActiveCriteria(...args),
}));
vi.mock("@/jobs/jobs.db", () => ({
  getJobById: (...args: unknown[]) => getJobById(...args),
}));
vi.mock("@/usage/usage.service", () => ({
  consumeQuota: (...args: unknown[]) => consumeQuota(...args),
}));
vi.mock("./messages.db", () => ({
  upsertDraftMessage: (...args: unknown[]) => upsertDraftMessage(...args),
  getMessages: vi.fn(),
  getReadyToSendMessages: vi.fn(),
  approveMessage: vi.fn(),
  markMessageSent: vi.fn(),
}));

const db = {} as never;

// A hand-added hiring manager: LinkedIn profile, no phone.
const hiringManagerLead = {
  id: "lead_1",
  bucketId: null,
  jobId: null,
  firstName: "Ada",
  company: "Analytical Engines",
  title: "VP Engineering",
  linkedinUrl: "https://linkedin.com/in/ada",
  phone: null,
  headline: null,
  about: null,
  recentPosts: null,
};

// A paper merchant saved from Places: a phone number and nothing else.
const supplierLead = {
  ...hiringManagerLead,
  id: "lead_2",
  bucketId: "bucket_paper",
  firstName: "مكتبة بكير",
  company: "مكتبة بكير",
  title: "Stationery shop",
  linkedinUrl: null,
  phone: "0225211040",
};

const jobCriteria = {
  elevatorPitch: "Full-stack developer, 6 years, React and Next.js.",
  resumeText: "CURRICULUM VITAE — React, TypeScript, Node…",
  skills: ["React", "TypeScript"],
  model: "gpt-4o-mini",
  titles: ["React Developer"],
};

async function generate(input: { leadId: string; template?: string }) {
  const { generateAndSaveMessage } = await import("./messages.service");
  return generateAndSaveMessage(db, "user_1", input as never);
}

/** The single argument handed to the model builder. */
function promptInput() {
  return generateOutreachMessage.mock.calls[0][0];
}

describe("generateAndSaveMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeQuota.mockResolvedValue(undefined);
    generateOutreachMessage.mockResolvedValue("…drafted message…");
    upsertDraftMessage.mockImplementation(async (_db, _userId, draft) => draft);
    getActiveCriteria.mockResolvedValue(jobCriteria);
    getBucketById.mockResolvedValue(null);
    getJobById.mockResolvedValue(null);
    getLeadById.mockResolvedValue(hiringManagerLead);
  });

  it("writes from the bucket's pitch rather than the account's elevator pitch", async () => {
    getLeadById.mockResolvedValue(supplierLead);
    getBucketById.mockResolvedValue({
      id: "bucket_paper",
      name: "Dad's paper factory",
      kind: "suppliers",
      pitch: "We import 80gsm engineering drawing rolls and sell across Egypt.",
    });

    await generate({ leadId: "lead_2" });

    expect(promptInput().senderPitch).toBe(
      "We import 80gsm engineering drawing rolls and sell across Egypt.",
    );
    expect(promptInput().senderPitch).not.toContain("Full-stack developer");
  });

  // The whole point of the kinds. A suppliers bucket is buying, not job hunting.
  it("picks the template from the bucket's kind when none is named", async () => {
    getLeadById.mockResolvedValue(supplierLead);
    getBucketById.mockResolvedValue({ kind: "suppliers", name: "Suppliers", pitch: "Paper." });

    await generate({ leadId: "lead_2" });

    expect(promptInput().template).toBe("supplier_enquiry");
  });

  it("picks the client pitch template for a clients bucket", async () => {
    getLeadById.mockResolvedValue({ ...supplierLead, bucketId: "bucket_clients" });
    getBucketById.mockResolvedValue({ kind: "clients", name: "Clients", pitch: "We build apps." });

    await generate({ leadId: "lead_2" });

    expect(promptInput().template).toBe("client_pitch");
  });

  // A résumé in a purchasing enquiry is how the paper factory ends up pitching React.
  it("never sends the CV or skills on a business message", async () => {
    getLeadById.mockResolvedValue(supplierLead);
    getBucketById.mockResolvedValue({ kind: "suppliers", name: "Suppliers", pitch: "Paper." });

    await generate({ leadId: "lead_2" });

    expect(promptInput().resumeText).toBeUndefined();
    expect(promptInput().userSkills).toBeUndefined();
  });

  it("still sends the CV on a job application", async () => {
    await generate({ leadId: "lead_1" });

    expect(promptInput().template).toBe("hiring_manager");
    expect(promptInput().resumeText).toBe(jobCriteria.resumeText);
    expect(promptInput().userSkills).toEqual(["React", "TypeScript"]);
  });

  // A business saved from Places carries its website in linkedinUrl, so sniffing
  // that field would call a corner shop a LinkedIn contact.
  it("writes business outreach for WhatsApp when the contact is a phone number", async () => {
    getLeadById.mockResolvedValue(supplierLead);
    getBucketById.mockResolvedValue({ kind: "suppliers", name: "Suppliers", pitch: "Paper." });

    await generate({ leadId: "lead_2" });

    expect(promptInput().channel).toBe("whatsapp");
  });

  it("keeps job outreach on LinkedIn", async () => {
    await generate({ leadId: "lead_1" });

    expect(promptInput().channel).toBe("linkedin");
  });

  // A lead in no bucket behaves exactly as every lead did before buckets existed.
  it("falls back to the account's criteria for a lead in no bucket", async () => {
    await generate({ leadId: "lead_1" });

    expect(getBucketById).not.toHaveBeenCalled();
    expect(promptInput().senderPitch).toBe(jobCriteria.elevatorPitch);
  });

  // An explicit choice from the approval card must not be overridden by the bucket.
  it("honours a template the caller named", async () => {
    getLeadById.mockResolvedValue({ ...hiringManagerLead, bucketId: "bucket_jobs" });
    getBucketById.mockResolvedValue({ kind: "jobs", name: "Jobs", pitch: "Developer." });

    await generate({ leadId: "lead_1", template: "recruiter" });

    expect(promptInput().template).toBe("recruiter");
  });

  // Better a clear refusal than a message written from nothing at all.
  it("refuses when neither the bucket nor the account has anything to say", async () => {
    getActiveCriteria.mockResolvedValue(null);
    getLeadById.mockResolvedValue(supplierLead);
    getBucketById.mockResolvedValue({ kind: "suppliers", name: "Suppliers", pitch: null });

    await expect(generate({ leadId: "lead_2" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(generateOutreachMessage).not.toHaveBeenCalled();
  });

  // A business contact has no posting behind it, and inventing one invites the
  // model to reference a job that doesn't exist.
  it("does not attach job context to a business message", async () => {
    getLeadById.mockResolvedValue({ ...supplierLead, jobId: "job_1" });
    getBucketById.mockResolvedValue({ kind: "clients", name: "Clients", pitch: "We build apps." });

    await generate({ leadId: "lead_2" });

    expect(getJobById).not.toHaveBeenCalled();
    expect(promptInput().jobTitle).toBeUndefined();
  });
});
