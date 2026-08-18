import { describe, expect, it, vi, beforeEach } from "vitest";

// The Apify SDK is stubbed so these run offline and cost nothing. What's under
// test is the boundary: AUDIT C4 is "the actor's output shape was never verified
// and a rename becomes a NOT NULL violation three layers down".

const listItems = vi.fn();
const actorCall = vi.fn(async () => ({ defaultDatasetId: "ds_1" }));

vi.mock("apify-client", () => ({
  ApifyClient: class {
    actor() {
      return { call: actorCall };
    }
    dataset() {
      return { listItems };
    }
  },
}));


describe("findHiringManagers response parsing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps well-formed profiles", async () => {
    const { findHiringManagers } = await import("./client");
    listItems.mockResolvedValue({
      items: [
        {
          firstName: "Ada",
          lastName: "Lovelace",
          title: "VP Engineering",
          company: "Analytical Engines",
          linkedinUrl: "https://linkedin.com/in/ada",
          headline: "Building things",
          about: "Long bio",
        },
      ],
    });

    const [profile] = await findHiringManagers("Analytical Engines", "Engineer", undefined, "test-token");
    expect(profile.firstName).toBe("Ada");
    expect(profile.lastName).toBe("Lovelace");
    expect(profile.title).toBe("VP Engineering");
  });

  // Profile scrapers commonly return a combined name instead of split fields.
  it("splits a combined name when firstName is absent", async () => {
    const { findHiringManagers } = await import("./client");
    listItems.mockResolvedValue({
      items: [{ fullName: "Grace Brewster Hopper", companyName: "Univac" }],
    });

    const [profile] = await findHiringManagers("Univac", "Engineer", undefined, "test-token");
    expect(profile.firstName).toBe("Grace");
    expect(profile.lastName).toBe("Brewster Hopper");
    expect(profile.company).toBe("Univac");
  });

  // The exact C4 scenario: firstName and company are NOT NULL on leads, so a
  // record missing them used to reach the insert and blow up there.
  it("drops a record with no usable name instead of letting it reach the insert", async () => {
    const { findHiringManagers } = await import("./client");
    listItems.mockResolvedValue({
      items: [
        { headline: "no name anywhere", company: "Ghost Co" },
        { firstName: "Real", company: "Ghost Co" },
      ],
    });

    const profiles = await findHiringManagers("Ghost Co", "Engineer", undefined, "test-token");
    expect(profiles).toHaveLength(1);
    expect(profiles[0].firstName).toBe("Real");
  });

  it("reports a schema change rather than returning a misleading zero", async () => {
    const { findHiringManagers, ApifyResponseError } = await import("./client");
    // Data came back, but nothing in it is recognisable.
    listItems.mockResolvedValue({
      items: [{ some_new_field: "x" }, { some_new_field: "y" }],
    });

    await expect(findHiringManagers("Acme", "Engineer", undefined, "test-token")).rejects.toBeInstanceOf(
      ApifyResponseError,
    );
  });

  it("returns empty when the actor genuinely found nobody", async () => {
    const { findHiringManagers } = await import("./client");
    listItems.mockResolvedValue({ items: [] });

    // No results is a real answer, not an error.
    await expect(findHiringManagers("Acme", "Engineer", undefined, "test-token")).resolves.toEqual([]);
  });

  it("falls back to the searched company when the profile lists another", async () => {
    const { findHiringManagers } = await import("./client");
    listItems.mockResolvedValue({ items: [{ firstName: "Alan", company: "" }] });

    const [profile] = await findHiringManagers("Bletchley", "Engineer", undefined, "test-token");
    expect(profile.company).toBe("Bletchley");
  });
});
