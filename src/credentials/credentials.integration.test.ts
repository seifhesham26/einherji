import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

// Unit tests prove the cipher works. Only this proves it is actually wired into
// the write path — the failure mode for AUDIT M10 is a perfectly good encryption
// helper that nothing calls, leaving plaintext in the column.
//
//   SCRAPER_INTEGRATION=1 SCRAPER_TEST_USER_ID=<id> npx vitest run src/credentials
const isEnabled =
  process.env.SCRAPER_INTEGRATION === "1" && Boolean(process.env.SCRAPER_TEST_USER_ID);
const describeIntegration = isEnabled ? describe : describe.skip;

const secretUserId = `crypto-test-${Date.now()}`;
const APIFY_TOKEN = "apify_api_plaintext_canary_value";
const ADZUNA_KEY = "adzuna_secret_canary_value";

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values({
    id: secretUserId,
    name: "Crypto Test",
    email: `${secretUserId}@invalid.test`,
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

  await db.delete(users).where(eq(users.id, secretUserId));
});

describeIntegration("secrets at rest (live, writes to db)", () => {
  it("stores source credentials as ciphertext, not plaintext", async () => {
    const { db } = await import("@/lib/db");
    const { sourceCredentials } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { upsertCredentials, getCredentialsForSource } = await import("./credentials.db");

    await upsertCredentials(db, secretUserId, "adzuna", {
      appId: "public-app-id",
      apiKey: ADZUNA_KEY,
    });

    // Read the column directly, bypassing the helper that decrypts — this is the
    // view an attacker with a database dump gets.
    const [raw] = await db
      .select()
      .from(sourceCredentials)
      .where(eq(sourceCredentials.userId, secretUserId));

    expect(JSON.stringify(raw.credentials)).not.toContain(ADZUNA_KEY);
    expect(raw.credentials.apiKey.startsWith("v1.")).toBe(true);

    // ...and it still round-trips for the code that needs the real value.
    const readBack = await getCredentialsForSource(db, secretUserId, "adzuna");
    expect(readBack?.credentials.apiKey).toBe(ADZUNA_KEY);
    expect(readBack?.credentials.appId).toBe("public-app-id");
  }, 60_000);

  it("stores the apify token as ciphertext and still returns it to the server", async () => {
    const { db } = await import("@/lib/db");
    const { userSettings } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { upsertUserSettings, getSettingsByUserId } = await import("@/settings/settings.db");

    await upsertUserSettings(db, secretUserId, { apifyApiToken: APIFY_TOKEN });

    const [raw] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, secretUserId));

    expect(raw.apifyApiToken).not.toBe(APIFY_TOKEN);
    expect(raw.apifyApiToken?.startsWith("v1.")).toBe(true);

    // findHiringManagers needs the real token, so the db layer must hand it back.
    const settings = await getSettingsByUserId(db, secretUserId);
    expect(settings?.apifyApiToken).toBe(APIFY_TOKEN);
  }, 60_000);

  it("never sends the raw token to the client", async () => {
    const { db } = await import("@/lib/db");
    const { getUserSettings } = await import("@/settings/settings.service");

    const clientView = await getUserSettings(db, secretUserId);

    // The whole serialized payload, since this is what lands in the query cache.
    expect(JSON.stringify(clientView)).not.toContain(APIFY_TOKEN);
    expect(clientView?.hasApifyApiToken).toBe(true);
    expect(clientView?.apifyApiTokenPreview).toBe("••••alue");
  }, 60_000);

  it("keeps the saved token when an update submits a blank field", async () => {
    const { db } = await import("@/lib/db");
    const { updateIntegrations } = await import("@/settings/settings.service");
    const { getSettingsByUserId } = await import("@/settings/settings.db");

    // The form can no longer pre-fill the token, so a blank submit must not wipe it.
    await updateIntegrations(db, secretUserId, { apifyApiToken: "" });

    const settings = await getSettingsByUserId(db, secretUserId);
    expect(settings?.apifyApiToken).toBe(APIFY_TOKEN);
  }, 60_000);

  it("clears the token only when disconnect is called explicitly", async () => {
    const { db } = await import("@/lib/db");
    const { disconnectApify } = await import("@/settings/settings.service");
    const { getSettingsByUserId } = await import("@/settings/settings.db");

    await disconnectApify(db, secretUserId);

    const settings = await getSettingsByUserId(db, secretUserId);
    expect(settings?.apifyApiToken).toBeNull();
  }, 60_000);
});
