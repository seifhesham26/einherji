import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { generateOutreachMessage } from "@/lib/ai/client";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getLeadById } from "@/leads/leads.db";
import { getJobById } from "@/jobs/jobs.db";
import { setLeadMessageSent } from "@/leads/leads.db";
import { getMessages, upsertDraftMessage, approveMessage } from "./messages.db";
import type { GetMessagesInput, GenerateMessageInput, ApproveMessageInput, MessageTemplate } from "./messages.validators";
import { DEFAULT_MODEL } from "@/criteria/criteria.validators";

export async function fetchMessages(db: Database, userId: string, input: GetMessagesInput) {
  return getMessages(db, userId, input.status);
}

export async function generateAndSaveMessage(db: Database, userId: string, input: GenerateMessageInput) {
  const [lead, activeCriteria] = await Promise.all([
    getLeadById(db, input.leadId),
    getActiveCriteria(db, userId),
  ]);

  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  if (!activeCriteria) throw new TRPCError({ code: "BAD_REQUEST", message: "No active criteria found. Set up your criteria first." });

  const job = lead.jobId ? await getJobById(db, lead.jobId) : null;

  const messageBody = await generateOutreachMessage({
    jobTitle: job?.title ?? "the role",
    jobCompany: lead.company,
    jobDescription: job?.description ?? "",
    jobUrl: job?.jobUrl ?? "",
    leadFirstName: lead.firstName,
    leadTitle: lead.title ?? "",
    leadHeadline: lead.headline ?? undefined,
    leadAbout: lead.about ?? undefined,
    leadRecentPosts: lead.recentPosts ?? undefined,
    resumeText: activeCriteria.resumeText ?? "",
    elevatorPitch: activeCriteria.elevatorPitch ?? "",
    userSkills: activeCriteria.skills ?? [],
    template: input.template as MessageTemplate,
    model: activeCriteria.model ?? DEFAULT_MODEL,
  });

  // Replaces existing draft instead of creating duplicates
  return upsertDraftMessage(db, userId, {
    leadId: lead.id,
    jobId: lead.jobId ?? null,
    body: messageBody,
    templateUsed: input.template as MessageTemplate,
  });
}

export async function approveAndUpdateLead(db: Database, input: ApproveMessageInput) {
  const updated = await approveMessage(db, input.messageId, input.editedBody);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });

  await setLeadMessageSent(db, updated.leadId);
  return updated;
}
