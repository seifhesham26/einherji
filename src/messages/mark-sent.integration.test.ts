import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

// The send transition is a status machine enforced in SQL, so it's tested
// against a real database.
//
//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/messages
const isEnabled =
  process.env.SCRAPER_INTEGRATION === "1" && Boolean(process.env.SCRAPER_TEST_USER_ID);
const describeIntegration = isEnabled ? describe : describe.skip;

const ownerId = `send-test-${Date.now()}`;
const strangerId = `send-stranger-${Date.now()}`;

async function createDraft(userId: string) {
  const { db } = await import("@/lib/db");
  const { insertLeads } = await import("@/leads/leads.db");
  const { upsertDraftMessage } = await import("./messages.db");

  const [lead] = await insertLeads(db, userId, [{ firstName: "Target", company: "Target Co" }]);
  const message = await upsertDraftMessage(db, userId, {
    leadId: lead.id,
    body: "hello there",
    templateUsed: "hiring_manager",
  });
  return { lead, message };
}

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values(
    [ownerId, strangerId].map((id) => ({
      id,
      name: id,
      email: `${id}@invalid.test`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
});

afterAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  const { inArray } = await import("drizzle-orm");

  await db.delete(users).where(inArray(users.id, [ownerId, strangerId]));
});

describeIntegration("marking a message sent (live, writes to db)", () => {
  it("records sentAt and moves the lead to message_sent", async () => {
    const { db } = await import("@/lib/db");
    const { approveAndUpdateLead, markMessageAsSent } = await import("./messages.service");
    const { getLeadById } = await import("@/leads/leads.db");

    const { lead, message } = await createDraft(ownerId);

    await approveAndUpdateLead(db, ownerId, { messageId: message.id });

    // Regression: approving used to flip the lead to message_sent immediately,
    // so the tracker claimed outreach that had not happened.
    const afterApproval = await getLeadById(db, ownerId, lead.id);
    expect(afterApproval?.status).toBe("not_contacted");
    expect(afterApproval?.lastContactedAt).toBeNull();

    const sent = await markMessageAsSent(db, ownerId, { messageId: message.id });
    expect(sent.status).toBe("sent");
    expect(sent.sentAt).toBeInstanceOf(Date);

    const afterSend = await getLeadById(db, ownerId, lead.id);
    expect(afterSend?.status).toBe("message_sent");
    expect(afterSend?.lastContactedAt).toBeInstanceOf(Date);
  }, 60_000);

  it("refuses to send a draft that was never approved", async () => {
    const { db } = await import("@/lib/db");
    const { markMessageAsSent } = await import("./messages.service");

    const { message } = await createDraft(ownerId);

    // The status is part of the WHERE clause, so review can't be skipped.
    await expect(markMessageAsSent(db, ownerId, { messageId: message.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  }, 60_000);

  it("does not move sentAt when the same message is sent twice", async () => {
    const { db } = await import("@/lib/db");
    const { approveAndUpdateLead, markMessageAsSent } = await import("./messages.service");

    const { message } = await createDraft(ownerId);
    await approveAndUpdateLead(db, ownerId, { messageId: message.id });

    const first = await markMessageAsSent(db, ownerId, { messageId: message.id });

    // A double-click must not rewrite the timestamp of something already sent.
    await expect(markMessageAsSent(db, ownerId, { messageId: message.id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const { getReadyToSendMessages } = await import("./messages.db");
    const stillWaiting = await getReadyToSendMessages(db, ownerId);
    expect(stillWaiting.some((row) => row.message.id === message.id)).toBe(false);
    expect(first.sentAt).toBeInstanceOf(Date);
  }, 60_000);

  it("will not let one user send another user's message", async () => {
    const { db } = await import("@/lib/db");
    const { approveAndUpdateLead, markMessageAsSent } = await import("./messages.service");
    const { getReadyToSendMessages } = await import("./messages.db");

    const { message } = await createDraft(ownerId);
    await approveAndUpdateLead(db, ownerId, { messageId: message.id });

    await expect(
      markMessageAsSent(db, strangerId, { messageId: message.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // And it's still sitting in the owner's queue, untouched.
    const ownerQueue = await getReadyToSendMessages(db, ownerId);
    expect(ownerQueue.some((row) => row.message.id === message.id)).toBe(true);
  }, 60_000);

  it("lists only approved and edited messages as ready to send", async () => {
    const { db } = await import("@/lib/db");
    const { approveAndUpdateLead } = await import("./messages.service");
    const { getReadyToSendMessages } = await import("./messages.db");

    const draftOnly = await createDraft(ownerId);
    const approved = await createDraft(ownerId);
    await approveAndUpdateLead(db, ownerId, { messageId: approved.message.id });

    const ready = await getReadyToSendMessages(db, ownerId);
    const readyIds = ready.map((row) => row.message.id);

    expect(readyIds).toContain(approved.message.id);
    expect(readyIds).not.toContain(draftOnly.message.id);
  }, 60_000);
});
