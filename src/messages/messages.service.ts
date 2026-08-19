import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { generateOutreachMessage } from "@/lib/ai/client";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getLeadById } from "@/leads/leads.db";
import { getJobById } from "@/jobs/jobs.db";
import { setLeadMessageSent } from "@/leads/leads.db";
import { consumeQuota } from "@/usage/usage.service";
import {
  approveMessage,
  getMessages,
  getReadyToSendMessages,
  markMessageSent,
  upsertDraftMessage,
} from "./messages.db";
import type {
  GetMessagesInput,
  GenerateMessageInput,
  ApproveMessageInput,
  MarkMessageSentInput,
  MessageTemplate,
} from "./messages.validators";
import { DEFAULT_MODEL } from "@/criteria/criteria.validators";

export async function fetchMessages(db: Database, userId: string, input: GetMessagesInput) {
  return getMessages(db, userId, input.status);
}

export async function generateAndSaveMessage(db: Database, userId: string, input: GenerateMessageInput) {
  // Charged before the model call, not after — a completion that errors partway
  // can still have been billed.
  await consumeQuota(db, userId, "generate_message");

  // Both scoped to userId. The lead lookup wasn't, which meant supplying someone
  // else's leadId fed their hiring manager's name, headline, about text and
  // recent posts into an LLM prompt and saved the result to your account.
  const [lead, activeCriteria] = await Promise.all([
    getLeadById(db, userId, input.leadId),
    getActiveCriteria(db, userId),
  ]);

  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  if (!activeCriteria) throw new TRPCError({ code: "BAD_REQUEST", message: "No active criteria found. Set up your criteria first." });

  const job = lead.jobId ? await getJobById(db, userId, lead.jobId) : null;

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

export async function approveAndUpdateLead(
  db: Database,
  userId: string,
  input: ApproveMessageInput,
) {
  const updated = await approveMessage(db, userId, input.messageId, input.editedBody);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });

  // The lead is deliberately *not* moved to message_sent here. Approving means
  // "this draft is good", not "I have contacted this person" — marking them
  // contacted at approval time made the tracker claim outreach that never
  // happened. That transition belongs to markMessageAsSent.
  return updated;
}

export async function fetchReadyToSend(db: Database, userId: string) {
  return getReadyToSendMessages(db, userId);
}

/**
 * Records that the user actually sent an approved message.
 *
 * This is the point the lead becomes "contacted" — it's the first moment the
 * claim is true. Sending itself is manual: the app has no email address for a
 * lead (the profile scraper doesn't return one), so the user copies the text and
 * sends it themselves.
 */
export async function markMessageAsSent(
  db: Database,
  userId: string,
  input: MarkMessageSentInput,
) {
  const sent = await markMessageSent(db, userId, input.messageId);
  if (!sent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No approved message found to mark as sent.",
    });
  }

  await setLeadMessageSent(db, userId, sent.leadId);
  return sent;
}
