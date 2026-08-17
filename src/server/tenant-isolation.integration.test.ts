import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

// Proves the AUDIT C2 IDOR fixes actually hold, by running the real service
// functions against the real database as the wrong user. An ownership fix that
// isn't exercised is a claim, not a fact — the whole class of bug is "the query
// looks right and quietly isn't".
//
//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/server/tenant-isolation.integration.test.ts
//
// The victim needs a real row in the user table: since migration 0004 every
// user-scoped table has a foreign key on user_id, so a made-up id is rejected.
// Tearing that row down cascades the rest away, which is the cascade doing its job.
const attackerUserId = process.env.SCRAPER_TEST_USER_ID;
const isEnabled = process.env.SCRAPER_INTEGRATION === "1" && Boolean(attackerUserId);
const describeIntegration = isEnabled ? describe : describe.skip;

const victimUserId = `idor-test-victim-${Date.now()}`;
const attackerLeadIds: string[] = [];

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values({
    id: victimUserId,
    name: "IDOR Test Victim",
    email: `${victimUserId}@invalid.test`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  if (!isEnabled) return;

  const { db } = await import("@/lib/db");
  const { users, leads } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  // Rows created under the real account are removed by id — never by user, which
  // would take the account's own data with them.
  for (const leadId of attackerLeadIds) {
    await db.delete(leads).where(eq(leads.id, leadId));
  }

  // One delete: the cascade clears the victim's leads and messages.
  await db.delete(users).where(eq(users.id, victimUserId));
});

async function createVictimLead() {
  const { db } = await import("@/lib/db");
  const { insertLeads } = await import("@/leads/leads.db");

  const [lead] = await insertLeads(db, victimUserId, [
    { firstName: "Victim", lastName: "Manager", company: "Victim Corp", title: "Head of Eng" },
  ]);
  return lead;
}

describeIntegration("tenant isolation (live, writes to db)", () => {
  // C2a — leads.update filtered on the lead id alone, so any signed-in user could
  // rewrite the status, notes and follow-up date of any lead in the database.
  it("will not let one user update another user's lead", async () => {
    const { db } = await import("@/lib/db");
    const { patchLead } = await import("@/leads/leads.service");
    const { getLeadById } = await import("@/leads/leads.db");

    const victimLead = await createVictimLead();

    await expect(
      patchLead(db, attackerUserId!, {
        id: victimLead.id,
        status: "rejected",
        notes: "written by the wrong user",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // The rejection must also mean nothing was written.
    const afterAttempt = await getLeadById(db, victimUserId, victimLead.id);
    expect(afterAttempt?.status).toBe("not_contacted");
    expect(afterAttempt?.notes).toBeNull();
  }, 60_000);

  // C2c — the lead lookup was unscoped, so another user's leadId fed their
  // hiring manager's headline, about text and recent posts into an LLM prompt.
  it("will not read another user's lead into a generated message", async () => {
    const { db } = await import("@/lib/db");
    const { generateAndSaveMessage } = await import("@/messages/messages.service");

    const victimLead = await createVictimLead();

    // Must fail on the ownership check, before any model is called — otherwise
    // the exfiltration is already paid for and only the response is withheld.
    await expect(
      generateAndSaveMessage(db, attackerUserId!, {
        leadId: victimLead.id,
        template: "hiring_manager",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  }, 60_000);

  // C2b — approving filtered on message id alone, and then flipped the *victim's*
  // lead to message_sent and stamped lastContactedAt.
  it("will not let one user approve another user's message", async () => {
    const { db } = await import("@/lib/db");
    const { approveAndUpdateLead } = await import("@/messages/messages.service");
    const { upsertDraftMessage, getMessages } = await import("@/messages/messages.db");
    const { getLeadById } = await import("@/leads/leads.db");

    const victimLead = await createVictimLead();
    const victimMessage = await upsertDraftMessage(db, victimUserId, {
      leadId: victimLead.id,
      body: "victim's draft",
      templateUsed: "hiring_manager",
    });

    await expect(
      approveAndUpdateLead(db, attackerUserId!, { messageId: victimMessage.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    // Neither the message nor the lead it points at may have moved.
    const victimDrafts = await getMessages(db, victimUserId, "draft");
    expect(victimDrafts.some((row) => row.message.id === victimMessage.id)).toBe(true);

    const leadAfter = await getLeadById(db, victimUserId, victimLead.id);
    expect(leadAfter?.status).toBe("not_contacted");
    expect(leadAfter?.lastContactedAt).toBeNull();
  }, 60_000);

  // The owner must still be able to do all of this — a fix that also breaks the
  // legitimate path is not a fix.
  it("still lets the owner update their own lead", async () => {
    const { db } = await import("@/lib/db");
    const { insertLeads, getLeadById } = await import("@/leads/leads.db");
    const { patchLead } = await import("@/leads/leads.service");

    const [ownLead] = await insertLeads(db, attackerUserId!, [
      { firstName: "Own", company: "Own Corp" },
    ]);
    attackerLeadIds.push(ownLead.id);

    const updated = await patchLead(db, attackerUserId!, {
      id: ownLead.id,
      status: "reply_received",
      notes: "mine to edit",
    });

    expect(updated.status).toBe("reply_received");

    const reread = await getLeadById(db, attackerUserId!, ownLead.id);
    expect(reread?.notes).toBe("mine to edit");
    // Cleanup is handled by afterAll, which deletes only the ids recorded above.
  }, 60_000);
});
