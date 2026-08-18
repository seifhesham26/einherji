import { beforeEach, describe, expect, it, vi } from "vitest";

// Credentials are per-account by design — there is no server-wide fallback. A
// shared key would mean one account's scraping spends another's paid quota,
// silently, because it would look like it was working.

const getCredentialsForSource = vi.fn();

vi.mock("./credentials.db", () => ({
  getCredentialsForSource: (...args: unknown[]) => getCredentialsForSource(...args),
  getAllCredentials: vi.fn(async () => []),
  upsertCredentials: vi.fn(),
  deleteCredentials: vi.fn(),
}));

const db = {} as never;

describe("resolveCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCredentialsForSource.mockResolvedValue(null);
  });

  it("returns the key saved on the account", async () => {
    const { resolveCredentials } = await import("./credentials.service");
    getCredentialsForSource.mockResolvedValue({
      credentials: { appId: "user-app", apiKey: "user-key" },
    });

    await expect(resolveCredentials(db, "user_1", "adzuna")).resolves.toEqual({
      appId: "user-app",
      apiKey: "user-key",
    });
  });

  it("returns null when the account has no key", async () => {
    const { resolveCredentials } = await import("./credentials.service");
    await expect(resolveCredentials(db, "user_1", "adzuna")).resolves.toBeNull();
  });

  // Half a key fails upstream looking like a bad key, which is a confusing way to
  // spend an afternoon. Treat it as not configured instead.
  it("treats a half-filled key as not configured", async () => {
    const { resolveCredentials } = await import("./credentials.service");
    getCredentialsForSource.mockResolvedValue({ credentials: { appId: "user-app" } });

    await expect(resolveCredentials(db, "user_1", "adzuna")).resolves.toBeNull();
  });

  it("does not fall back to any environment variable", async () => {
    const { resolveCredentials } = await import("./credentials.service");
    // Set every name a server-wide fallback might plausibly have used.
    process.env.ADZUNA_APP_ID = "env-app";
    process.env.ADZUNA_API_KEY = "env-key";
    process.env.APIFY_API_TOKEN = "env-apify";

    try {
      await expect(resolveCredentials(db, "user_1", "adzuna")).resolves.toBeNull();
    } finally {
      delete process.env.ADZUNA_APP_ID;
      delete process.env.ADZUNA_API_KEY;
      delete process.env.APIFY_API_TOKEN;
    }
  });

  it.each([
    ["reddit", { clientId: "id", clientSecret: "secret" }],
    ["twitter", { bearerToken: "bearer" }],
    ["serpapi", { apiKey: "serp" }],
  ])("resolves %s from the account", async (source, credentials) => {
    const { resolveCredentials } = await import("./credentials.service");
    getCredentialsForSource.mockResolvedValue({ credentials });

    await expect(
      resolveCredentials(db, "user_1", source as "reddit" | "twitter" | "serpapi"),
    ).resolves.toEqual(credentials);
  });
});

describe("findHiringManagers credentials", () => {
  it("refuses to run without the account's own Apify token", async () => {
    const { findHiringManagers } = await import("@/lib/apify/client");
    process.env.APIFY_API_TOKEN = "env-apify";

    try {
      // Apify bills per run, so this must never silently use a shared token.
      await expect(findHiringManagers("Acme", "Engineer", undefined, null)).rejects.toThrow(
        /Add your key in Settings/,
      );
    } finally {
      delete process.env.APIFY_API_TOKEN;
    }
  });
});
