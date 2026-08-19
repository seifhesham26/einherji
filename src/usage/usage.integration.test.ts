import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

// The quota is only worth anything if it survives a cold start, which means it
// has to be read back out of the database — so it's tested against a real one.
//
//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/usage/usage.integration.test.ts
const isEnabled =
  process.env.SCRAPER_INTEGRATION === "1" && Boolean(process.env.SCRAPER_TEST_USER_ID);
const describeIntegration = isEnabled ? describe : describe.skip;

const quotaUserId = `quota-test-${Date.now()}`;
// A second throwaway account. These tests used to consume the *real* account's
// parse_cv allowance, so running them a few times in a day exhausted the very
// quota they were asserting against — the tests failed while the code was right.
const otherQuotaUserId = `quota-other-${Date.now()}`;

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values(
    [quotaUserId, otherQuotaUserId].map((id) => ({
      id,
      name: "Quota Test",
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

  // Cascades the usage rows away with them.
  await db.delete(users).where(inArray(users.id, [quotaUserId, otherQuotaUserId]));
});

describeIntegration("usage quotas (live, writes to db)", () => {
  it("stops the caller once the limit for an action is spent", async () => {
    const { db } = await import("@/lib/db");
    const { consumeQuota } = await import("./usage.service");
    const { DAILY_QUOTAS } = await import("./usage.validators");

    const limit = DAILY_QUOTAS.parse_cv;

    for (let call = 0; call < limit; call++) {
      await consumeQuota(db, quotaUserId, "parse_cv");
    }

    await expect(consumeQuota(db, quotaUserId, "parse_cv")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
  }, 120_000);

  it("keeps each action's budget separate", async () => {
    const { db } = await import("@/lib/db");
    const { consumeQuota } = await import("./usage.service");

    // parse_cv is exhausted by the test above; spending it must not have touched
    // the others, or one runaway feature would disable the whole app.
    await expect(consumeQuota(db, quotaUserId, "generate_message")).resolves.toBeUndefined();
  }, 60_000);

  it("keeps each user's budget separate", async () => {
    const { db } = await import("@/lib/db");
    const { consumeQuota } = await import("./usage.service");

    await expect(
      consumeQuota(db, otherQuotaUserId, "parse_cv"),
    ).resolves.toBeUndefined();
  }, 60_000);

  it("reports what has been used and what is left", async () => {
    const { db } = await import("@/lib/db");
    const { fetchQuotaStatus } = await import("./usage.service");
    const { DAILY_QUOTAS } = await import("./usage.validators");

    const quotas = await fetchQuotaStatus(db, quotaUserId);
    const parseCv = quotas.find((quota) => quota.action === "parse_cv");

    expect(parseCv?.used).toBe(DAILY_QUOTAS.parse_cv);
    expect(parseCv?.remaining).toBe(0);

    const generate = quotas.find((quota) => quota.action === "generate_message");
    expect(generate?.remaining).toBe(DAILY_QUOTAS.generate_message - 1);
  }, 60_000);

  // The point of charging before the work: a call that throws has still been
  // billed by the provider, so a retry loop must not be free.
  it("counts an attempt that fails, not just a success", async () => {
    const { db } = await import("@/lib/db");
    const { getUsageInWindow } = await import("./usage.db");
    const { extractCv } = await import("@/criteria/criteria.service");
    const { QUOTA_WINDOW_MS } = await import("./usage.validators");

    const windowStart = () => new Date(Date.now() - QUOTA_WINDOW_MS);
    const before = await getUsageInWindow(db, otherQuotaUserId, "parse_cv", windowStart());

    // A private address — the SSRF guard rejects it, so this fails after the
    // quota is charged and without any network call leaving the box.
    await expect(
      extractCv(db, otherQuotaUserId, { cvUrl: "http://127.0.0.1/cv.pdf" }),
    ).rejects.toThrow();

    const after = await getUsageInWindow(db, otherQuotaUserId, "parse_cv", windowStart());
    expect(after.used).toBe(before.used + 1);
  }, 60_000);
});
