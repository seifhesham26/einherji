import { z } from "zod";

export const searchPlacesSchema = z.object({
  query: z.string().trim().min(2, "Say what you're looking for").max(200),
  // Biases results to a country, e.g. "eg". Two letters, ISO 3166-1 alpha-2.
  regionCode: z.string().trim().length(2).optional(),
  languageCode: z.string().trim().max(10).optional(),
});

export const savePlaceAsLeadSchema = z.object({
  placeId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  website: z.string().trim().max(500).optional(),
  category: z.string().trim().max(120).optional(),
  // Which hunt this business belongs to. Without it a saved supplier lands in
  // the same undifferentiated list as every hiring manager.
  bucketId: z.string().min(1).optional(),
});

export type SearchPlacesInput = z.infer<typeof searchPlacesSchema>;
export type SavePlaceAsLeadInput = z.infer<typeof savePlaceAsLeadSchema>;
