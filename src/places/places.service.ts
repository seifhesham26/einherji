import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { resolveCredentials } from "@/credentials/credentials.service";
import { consumeQuota } from "@/usage/usage.service";
import { createLead } from "@/leads/leads.service";
import { searchPlaces, PlacesError } from "@/lib/places/search-places";
import type { SavePlaceAsLeadInput, SearchPlacesInput } from "./places.validators";

/**
 * Searches businesses for the signed-in account.
 *
 * Results are returned to the caller and **not written anywhere**. Google's terms
 * allow storing `place_id` indefinitely but give no caching exception for name,
 * address or rating, so those live only as long as the response does. Saving one
 * is a separate, deliberate act by the user.
 */
export async function findBusinesses(db: Database, userId: string, input: SearchPlacesInput) {
  const credentials = await resolveCredentials(db, userId, "google_places");

  if (!credentials?.apiKey) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Add a Google Places API key in Settings → Source credentials to search for businesses.",
    });
  }

  // Places bills per search, so it's rate-limited like every other paid action.
  await consumeQuota(db, userId, "find_managers");

  try {
    return await searchPlaces(credentials.apiKey, input);
  } catch (error) {
    if (error instanceof PlacesError) {
      // Google's own wording is the useful part — "API key not valid" and
      // "billing not enabled" need completely different fixes.
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

/**
 * Keeps one business as a contact.
 *
 * This is the point where anything is stored, and it's the user choosing to keep
 * a contact rather than the app caching a search index. `placeId` is retained so
 * the listing can be found again; the rest is theirs to edit from then on.
 */
export async function savePlaceAsLead(
  db: Database,
  userId: string,
  input: SavePlaceAsLeadInput,
) {
  return createLead(db, userId, {
    // A business has no first name. The trading name is what you'd greet, and
    // firstName is NOT NULL on leads.
    firstName: input.name,
    company: input.name,
    title: input.category,
    phone: input.phone,
    linkedinUrl: input.website,
    headline: input.category,
    about: input.address,
    placeId: input.placeId,
    bucketId: input.bucketId,
  });
}
