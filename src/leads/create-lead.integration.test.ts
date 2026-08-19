import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/leads
const isEnabled =
  process.env.SCRAPER_INTEGRATION === "1" && Boolean(process.env.SCRAPER_TEST_USER_ID);
const describeIntegration = isEnabled ? describe : describe.skip;

const userId = `lead-form-${Date.now()}`;
const otherUserId = `lead-form-other-${Date.now()}`;

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values(
    [userId, otherUserId].map((id) => ({
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

  await db.delete(users).where(inArray(users.id, [userId, otherUserId]));
});

describeIntegration("adding a lead by hand (live, writes to db)", () => {
  it("stores a lead with only the required fields", async () => {
    const { db } = await import("@/lib/db");
    const { createLead } = await import("./leads.service");

    const lead = await createLead(db, userId, { firstName: "Ada", company: "Analytical Engines" });

    expect(lead.firstName).toBe("Ada");
    expect(lead.status).toBe("not_contacted");
    // Untouched optional fields must be null, not "" — one representation of
    // "not provided", so nothing downstream has to handle both.
    expect(lead.lastName).toBeNull();
    expect(lead.linkedinUrl).toBeNull();
  }, 60_000);

  it("normalises blank optional fields to null", async () => {
    const { db } = await import("@/lib/db");
    const { createLead } = await import("./leads.service");

    const lead = await createLead(db, userId, {
      firstName: "Grace",
      company: "Univac",
      lastName: "   ",
      title: "",
      headline: "",
      about: "",
      linkedinUrl: "",
    });

    expect(lead.lastName).toBeNull();
    expect(lead.title).toBeNull();
    expect(lead.about).toBeNull();
  }, 60_000);

  it("refuses a duplicate of the same person at the same company", async () => {
    const { db } = await import("@/lib/db");
    const { createLead } = await import("./leads.service");

    await createLead(db, userId, { firstName: "Alan", company: "Bletchley" });

    // Case differs — still the same person. insertLeads has no dedupe of its own.
    await expect(
      createLead(db, userId, { firstName: "alan", company: "bletchley" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  }, 60_000);

  it("treats the same LinkedIn URL as the same person even under a different name", async () => {
    const { db } = await import("@/lib/db");
    const { createLead } = await import("./leads.service");

    const url = `https://linkedin.com/in/dupe-${Date.now()}`;
    await createLead(db, userId, { firstName: "Katherine", company: "NASA", linkedinUrl: url });

    await expect(
      createLead(db, userId, { firstName: "Kathy", company: "NASA Langley", linkedinUrl: url }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  }, 60_000);

  it("does not treat another user's lead as a duplicate", async () => {
    const { db } = await import("@/lib/db");
    const { createLead } = await import("./leads.service");

    await createLead(db, userId, { firstName: "Shared", company: "Same Co" });

    // Dedupe is per account — two people can both be chasing the same manager.
    await expect(
      createLead(db, otherUserId, { firstName: "Shared", company: "Same Co" }),
    ).resolves.toBeDefined();
  }, 60_000);
});
