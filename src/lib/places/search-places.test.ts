import { afterEach, describe, expect, it, vi } from "vitest";
import { PlacesError, searchPlaces } from "./search-places";

afterEach(() => vi.unstubAllGlobals());

type FetchCall = [string, RequestInit];

function stubFetch(response: Response) {
  const calls: FetchCall[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    return response;
  });
  return calls;
}

function placesResponse(places: unknown) {
  return new Response(JSON.stringify({ places }), { status: 200 });
}

describe("searchPlaces", () => {
  it("maps a result to the fields outreach actually needs", async () => {
    stubFetch(
      placesResponse([
        {
          id: "place_1",
          displayName: { text: "Cairo Engineering Co" },
          formattedAddress: "12 Nile St, Cairo",
          nationalPhoneNumber: "02 1234 5678",
          websiteUri: "https://example.com",
          primaryTypeDisplayName: { text: "Engineering consultant" },
        },
      ]),
    );

    const [place] = await searchPlaces("key", { query: "engineering cairo" });

    expect(place).toEqual({
      placeId: "place_1",
      name: "Cairo Engineering Co",
      address: "12 Nile St, Cairo",
      phone: "02 1234 5678",
      website: "https://example.com",
      category: "Engineering consultant",
    });
  });

  // Places bills by which fields you request, in tiers. Adding an expensive one
  // to the mask silently multiplies the cost of every single search.
  it("asks only for the fields the result card shows", async () => {
    const calls = stubFetch(placesResponse([]));

    await searchPlaces("key", { query: "x" });

    const mask = (calls[0][1].headers as Record<string, string>)["X-Goog-FieldMask"];
    expect(mask).toContain("places.id");
    expect(mask).toContain("places.nationalPhoneNumber");
    // Photos and reviews are the expensive ones.
    expect(mask).not.toContain("photos");
    expect(mask).not.toContain("reviews");
    expect(mask).not.toContain("rating");
  });

  it("sends the key as a header rather than in the URL", async () => {
    const calls = stubFetch(placesResponse([]));

    await searchPlaces("secret-key", { query: "x" });

    expect(calls[0][0]).not.toContain("secret-key");
    expect((calls[0][1].headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("secret-key");
  });

  it("passes the country and language through", async () => {
    const calls = stubFetch(placesResponse([]));

    await searchPlaces("key", { query: "مهندس", regionCode: "eg", languageCode: "ar" });

    const body = JSON.parse(calls[0][1].body as string);
    expect(body).toMatchObject({ textQuery: "مهندس", regionCode: "eg", languageCode: "ar" });
  });

  // Places omits the key entirely when nothing matched, rather than sending [].
  it("treats a response with no places key as no results", async () => {
    stubFetch(new Response(JSON.stringify({}), { status: 200 }));

    await expect(searchPlaces("key", { query: "x" })).resolves.toEqual([]);
  });

  it("drops a result with no name instead of showing a blank row", async () => {
    stubFetch(placesResponse([{ id: "p1" }, { id: "p2", displayName: { text: "Real Co" } }]));

    const results = await searchPlaces("key", { query: "x" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Real Co");
  });

  // "API key not valid" and "billing not enabled" need completely different
  // fixes, so Google's own wording is worth more than a status code.
  it("surfaces Google's explanation for a refusal", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 }),
    );

    await expect(searchPlaces("key", { query: "x" })).rejects.toThrow("API key not valid");
  });

  it("reports a network failure as a Places error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("ECONNREFUSED"); });

    await expect(searchPlaces("key", { query: "x" })).rejects.toBeInstanceOf(PlacesError);
  });

  // No query means no billable call.
  it("does not call the API for an empty query", async () => {
    const calls = stubFetch(placesResponse([]));

    await expect(searchPlaces("key", { query: "   " })).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
