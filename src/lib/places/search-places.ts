import { z } from "zod";
import { parseArrayLeniently } from "@/lib/scrapers/job-source.types";

/**
 * Business search via the Google Places API (New).
 *
 * ── Why this is a *search*, not a scrape ─────────────────────────────────────
 * Every other source in this app pulls a feed into the database and works from
 * the copy. Google's terms don't allow that: `place_id` may be stored
 * indefinitely and coordinates for 30 days, but display fields — name, address,
 * rating — have no caching exception.
 *
 * So this returns results for the user to look at and choose from. Nothing is
 * written until they pick a business, and what's kept then is their own contact
 * record plus the `place_id` to re-find it. That's a person saving a contact,
 * not a cache of Google's index.
 *
 * ── Why the field mask is small ──────────────────────────────────────────────
 * Places bills by which fields you ask for, in tiers. Requesting only what the
 * card actually shows keeps every search in the cheaper tier; adding one
 * expensive field to the mask silently multiplies the bill for every call.
 */

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

// Only what the result card renders and what outreach needs.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
].join(",");

// Google caps this at 20 per request anyway.
const MAX_RESULTS = 20;

export class PlacesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlacesError";
  }
}

const localizedTextSchema = z.object({ text: z.string() }).nullish();

const placeSchema = z
  .object({
    id: z.string(),
    displayName: localizedTextSchema,
    formattedAddress: z.string().nullish(),
    nationalPhoneNumber: z.string().nullish(),
    websiteUri: z.string().nullish(),
    primaryTypeDisplayName: localizedTextSchema,
  })
  .transform((raw) => ({
    placeId: raw.id,
    name: raw.displayName?.text ?? null,
    address: raw.formattedAddress ?? null,
    phone: raw.nationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    category: raw.primaryTypeDisplayName?.text ?? null,
  }))
  // A result with no name can't be shown or saved as a contact.
  .refine((place): place is typeof place & { name: string } => Boolean(place.name));

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
}

export interface PlacesSearchInput {
  /** Plain language, e.g. "engineering consultancies in Cairo". */
  query: string;
  /** ISO country code — biases results, e.g. "eg". */
  regionCode?: string;
  /** BCP-47, e.g. "ar" to get Arabic names back. */
  languageCode?: string;
}

export async function searchPlaces(
  apiKey: string,
  input: PlacesSearchInput,
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  if (!input.query.trim()) return [];

  let response: Response;
  try {
    response = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: input.query,
        maxResultCount: MAX_RESULTS,
        ...(input.regionCode ? { regionCode: input.regionCode } : {}),
        ...(input.languageCode ? { languageCode: input.languageCode } : {}),
      }),
      signal,
    });
  } catch (error) {
    throw new PlacesError(
      `Couldn't reach Google Places: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  if (!response.ok) {
    // Google explains refusals in the body, and the explanation is the useful
    // part — "API key not valid" and "billing not enabled" are the two you'll
    // actually hit, and they need completely different fixes.
    const detail = await response
      .json()
      .then((body: { error?: { message?: string } }) => body.error?.message)
      .catch(() => null);

    throw new PlacesError(detail ?? `Google Places returned ${response.status}.`);
  }

  const payload = (await response.json()) as { places?: unknown };
  // Places omits the key entirely when nothing matched, rather than sending [].
  return parseArrayLeniently(payload.places ?? [], placeSchema);
}
