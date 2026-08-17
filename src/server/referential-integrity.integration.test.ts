import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

// Migration 0004 added the foreign keys. A constraint that exists but points at
// the wrong thing is indistinguishable from a correct one until something tries
// to violate it, so these tests do the violating.
//
//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/server/referential-integrity.integration.test.ts
const isEnabled =
  process.env.SCRAPER_INTEGRATION === "1" && Boolean(process.env.SCRAPER_TEST_USER_ID);
const describeIntegration = isEnabled ? describe : describe.skip;

const testUserId = `fk-test-user-${Date.now()}`;

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values({
    id: testUserId,
    name: "FK Test",
    email: `${testUserId}@invalid.test`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.delete(users).where(eq(users.id, testUserId));
});

describeIntegration("referential integrity (live, writes to db)", () => {
  it("refuses a row whose user does not exist", async () => {
    const { db } = await import("@/lib/db");
    const { insertLeads } = await import("@/leads/leads.db");

    // Before the foreign key this inserted happily and the row became invisible
    // orphan data that nothing would ever clean up.
    await expect(
      insertLeads(db, "user-that-does-not-exist", [{ firstName: "Ghost", company: "Nowhere" }]),
    ).rejects.toThrow();
  }, 60_000);

  // Regression: leads.job_id was ON DELETE NO ACTION, so removing a job that a
  // lead pointed at threw a foreign key violation. deleteJobsBySource does
  // exactly that, which made "turn a source off" fail once Find Managers had run.
  it("nulls a lead's jobId when its job is deleted, rather than throwing", async () => {
    const { db } = await import("@/lib/db");
    const { insertJobs, deleteJobsBySource } = await import("@/jobs/jobs.db");
    const { insertLeads, getLeadById } = await import("@/leads/leads.db");

    const [job] = await insertJobs(db, testUserId, [
      {
        sourceJobId: `fk-test-${Date.now()}`,
        source: "remoteok",
        title: "Test Role",
        company: "Test Co",
        jobUrl: "https://example.com/job",
        companyUrl: null,
        location: null,
        salary: null,
        description: null,
        postedAt: null,
        workType: "unknown",
        isRemote: null,
        tags: null,
        attributionText: null,
        attributionUrl: null,
      },
    ]);

    const [lead] = await insertLeads(db, testUserId, [
      { jobId: job.id, firstName: "Attached", company: "Test Co" },
    ]);

    await expect(deleteJobsBySource(db, testUserId, "remoteok")).resolves.toBeDefined();

    // The contact outlives the posting it came from.
    const leadAfter = await getLeadById(db, testUserId, lead.id);
    expect(leadAfter).not.toBeNull();
    expect(leadAfter?.jobId).toBeNull();
  }, 60_000);

  it("cascades a user's leads and messages away when the user is deleted", async () => {
    const { db } = await import("@/lib/db");
    const { users, leads, messages } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { insertLeads } = await import("@/leads/leads.db");
    const { upsertDraftMessage } = await import("@/messages/messages.db");

    const doomedUserId = `fk-cascade-${Date.now()}`;
    await db.insert(users).values({
      id: doomedUserId,
      name: "Doomed",
      email: `${doomedUserId}@invalid.test`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [lead] = await insertLeads(db, doomedUserId, [
      { firstName: "Doomed", company: "Doomed Co" },
    ]);
    await upsertDraftMessage(db, doomedUserId, {
      leadId: lead.id,
      body: "draft",
      templateUsed: "hiring_manager",
    });

    // One delete. Everything hanging off the user goes with it — no orphans left
    // behind carrying scraped personal data nothing can reach any more.
    await db.delete(users).where(eq(users.id, doomedUserId));

    expect(await db.select().from(leads).where(eq(leads.userId, doomedUserId))).toHaveLength(0);
    expect(
      await db.select().from(messages).where(eq(messages.userId, doomedUserId)),
    ).toHaveLength(0);
  }, 60_000);
});
