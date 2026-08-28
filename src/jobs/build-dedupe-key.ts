import { normalizeForMatch, significantWords } from "@/lib/scrapers/aggregators/match-query";

/**
 * A fingerprint for "this is the same posting", across sources.
 *
 * The unique index on jobs is `(userId, source, sourceJobId)`, which is correct
 * and insufficient: one role syndicated to RemoteOK, Arbeitnow and Jobicy is
 * three rows with three unrelated ids and no way to know they are one job. As
 * the source count grows that is most of the noise in the list.
 *
 * Deliberately conservative — it folds copies together only when company, title
 * and city all agree after normalising. Two different roles are never merged;
 * the cost of being cautious is the occasional duplicate that slips through,
 * which is far cheaper than silently hiding a job the user wanted to see.
 */

// Legal suffixes are written inconsistently across boards — "Acme", "Acme Inc",
// "Acme, Inc." and "Acme Ltd" are one employer, and keeping them apart is the
// single most common reason a genuine duplicate isn't recognised.
const COMPANY_LEGAL_SUFFIXES = new Set([
  "inc", "inc.", "llc", "ltd", "ltd.", "limited", "corp", "corp.", "corporation",
  "co", "co.", "company", "gmbh", "bv", "nv", "sa", "ag", "plc", "pty", "srl", "sarl",
  "group", "holdings", "technologies", "technology", "labs", "software",
]);

// Boards decorate the same title differently: "(Remote)", "(m/f/d)", "- Contract".
// Everything from the first bracket onwards is decoration, not identity.
const TITLE_DECORATION = /[([{].*$/;

// Seniority and arrangement words that some boards put in the title and others
// put in a field. Removing them from the key is what lets the two copies meet.
const TITLE_NOISE = new Set(["remote", "hybrid", "onsite", "fulltime", "parttime", "contract"]);

const KEY_SEPARATOR = "|";

export interface DedupeKeyParts {
  company: string;
  title: string;
  location?: string | null;
}

export function buildDedupeKey({ company, title, location }: DedupeKeyParts): string {
  return [
    normalizeCompany(company),
    normalizeTitle(title),
    normalizeCity(location),
  ].join(KEY_SEPARATOR);
}

function normalizeCompany(company: string): string {
  const words = significantWords(company).filter(
    (word) => !COMPANY_LEGAL_SUFFIXES.has(word),
  );

  // Everything was a legal suffix, or the name is one short token like "X".
  // Falling back to the folded original beats returning an empty component that
  // would match every other company whose name also vanished.
  if (words.length === 0) return normalizeForMatch(company).trim();

  return words.join(" ");
}

function normalizeTitle(title: string): string {
  const withoutDecoration = title.replace(TITLE_DECORATION, "");
  const words = significantWords(withoutDecoration).filter((word) => !TITLE_NOISE.has(word));

  if (words.length === 0) return normalizeForMatch(withoutDecoration).trim();

  // Sorted, because boards reorder the same words — "Developer, Frontend" and
  // "Frontend Developer" are the same job advertised by two feeds.
  return [...words].sort().join(" ");
}

/**
 * The city, and only the city.
 *
 * Location strings are the least consistent field any source returns: "Cairo",
 * "Cairo, Egypt" and "Cairo, EG" are one place. Taking the first significant
 * token gets all three to "cairo". Keeping the city at all matters because a
 * large employer runs the same title in a dozen cities, and folding those into
 * one row would hide eleven real openings.
 */
function normalizeCity(location: string | null | undefined): string {
  if (!location) return "";

  const [firstToken] = significantWords(location);
  return firstToken ?? "";
}
