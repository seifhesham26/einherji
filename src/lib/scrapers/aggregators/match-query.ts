import type { JobSearchQuery, ScrapedJob, WorkType } from "../job-source.types";

// Most aggregators hand back their entire current feed with no server-side
// keyword filter, so the matching happens here. Kept in one place so every
// source filters identically — otherwise "React" would mean something different
// depending on which board a job came from.

const REMOTE_LOCATION_HINTS = ["remote", "anywhere", "worldwide", "distributed"];

/**
 * True when a job plausibly matches what the user asked for.
 *
 * Deliberately lenient on titles: a search for "Frontend Engineer" should still
 * surface "Senior Frontend Developer", so any single significant word matching is
 * enough. Being too strict here silently hides good results, which is much worse
 * than showing a few extra.
 */
export function matchesQuery(job: ScrapedJob, query: JobSearchQuery): boolean {
  return matchesTitle(job, query.titles) && matchesLocation(job, query.locations) && matchesWorkType(job, query.workTypes);
}

function matchesTitle(job: ScrapedJob, titles: string[]): boolean {
  if (titles.length === 0) return true;

  // Normalised on both sides — folding only the search term would still leave
  // "مصريه" failing to match "مصرية".
  const haystack = normalizeForMatch([job.title, ...(job.tags ?? [])].join(" "));

  return titles.some((title) => {
    const words = significantWords(title);
    // Only a genuinely empty term matches everything now, not an unparseable one.
    if (words.length === 0) return true;
    return words.some((word) => haystackContains(haystack, word));
  });
}

/**
 * Whether a job is somewhere the search asked for.
 *
 * "Remote" used to be a wildcard on both sides: a remote job satisfied any
 * filter, and listing "Remote" among the wanted locations satisfied any job. So
 * the paper factory bucket — Cairo and Giza, because that is where a supplier
 * can deliver — collected remote software roles from every board, and the job
 * bucket collected onsite roles in cities its owner can't reach.
 *
 * Remote is now a place like any other: it matches when the search asked for it.
 */
function matchesLocation(job: ScrapedJob, locations: string[]): boolean {
  if (locations.length === 0) return true;

  const wantsRemote = locations.some((location) =>
    isRemoteText(normalizeForMatch(location)),
  );

  const jobLocation = job.location ? normalizeForMatch(job.location) : "";
  // The flag and the text disagree often enough that both have to count — plenty
  // of feeds write "Remote" into the location and leave isRemote unset.
  const jobIsRemote = Boolean(job.isRemote) || isRemoteText(jobLocation);

  // A remote listing may still name somewhere — "Remote — Cairo" is a Cairo
  // result for a Cairo search even when the search never mentioned remote.
  if (jobIsRemote) return wantsRemote || matchesNamedPlace(jobLocation, locations);

  // Genuinely unlabelled, which many sources are. Dropping these would throw
  // away most of the feed. Sits below the check above on purpose: a job we know
  // is remote is not a job of unknown location.
  if (!jobLocation) return true;

  return matchesNamedPlace(jobLocation, locations);
}

function isRemoteText(normalizedText: string): boolean {
  return REMOTE_LOCATION_HINTS.some((hint) => normalizedText.includes(hint));
}

// Match on the city or country alone, so "Cairo, Egypt" matches "Cairo".
function matchesNamedPlace(jobLocation: string, locations: string[]): boolean {
  if (!jobLocation) return false;

  return locations.some((location) =>
    significantWords(location).some((word) => haystackContains(jobLocation, word)),
  );
}

function matchesWorkType(job: ScrapedJob, workTypes?: WorkType[]): boolean {
  if (!workTypes || workTypes.length === 0) return true;
  // Sources often can't tell us, and dropping every unlabelled job would throw
  // away most of the feed.
  if (job.workType === "unknown") return true;
  return workTypes.includes(job.workType);
}

// ─── Text normalisation ───────────────────────────────────────────────────────
//
// The original tokenizer split on /[^a-z0-9+#.]+/, which silently deleted every
// non-ASCII character. Arabic input produced an empty word list, and an empty
// list was read as "match everything" — so an Arabic search returned the whole
// feed while looking like it had filtered. Accented Latin ("Zürich", "José") and
// every other script had the same problem.

// Tashkeel and the tatweel stretching character carry no meaning for matching.
const ARABIC_DIACRITICS = /[ً-ٰٟـ]/g;

// Arabic writes the same word several ways and business listings are
// inconsistent about all of them, so they're folded together before comparison.
const ARABIC_LETTER_FOLDING: [RegExp, string][] = [
  [/[آأإٱ]/g, "ا"], // آ أ إ ٱ → ا
  [/ة/g, "ه"], // ة → ه
  [/ى/g, "ي"], // ى → ي
  [/ؤ/g, "و"], // ؤ → و
  [/ئ/g, "ي"], // ئ → ي
];

// "ال" is Arabic's definite article, written joined to the front of the word.
// Stripping it is what lets "الهندسية" match "هندسية" — otherwise they never meet.
const ARABIC_DEFINITE_ARTICLE = /^ال/;

// Any character that is not a letter or digit, in any script, separates words.
// "+", "#" and "." survive so C++, C# and .NET stay intact.
const WORD_SEPARATORS = /[^\p{L}\p{N}+#.]+/u;

const IS_LATIN_WORD = /^[a-z0-9+#.]+$/;

/**
 * Folds text into the form both sides of a comparison are measured in.
 *
 * Exported because callers matching against their own text need to apply the
 * same folding — comparing a normalised term against raw text finds nothing.
 */
export function normalizeForMatch(text: string): string {
  let normalized = text.toLowerCase().normalize("NFKC").replace(ARABIC_DIACRITICS, "");
  for (const [pattern, replacement] of ARABIC_LETTER_FOLDING) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalized;
}

// Drops filler that would match nearly everything ("senior engineer" shouldn't
// match on "senior" alone) and anything too short to be meaningful.
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "senior", "junior", "mid", "level", "staff",
  "principal", "lead", "i", "ii", "iii", "remote", "of", "in", "at",
  // Arabic grammatical filler, in the folded form normalizeForMatch produces.
  "على", "الي", "هذا", "هذه", "ذلك", "التي", "الذي", "كان", "عن", "مع", "من", "في",
]);

const MIN_WORD_LENGTH = 3;

/**
 * The meaningful terms in a search phrase, normalised for comparison.
 *
 * Falls back to the whole phrase when nothing survives filtering. That matters
 * well beyond Arabic: "C#", "Go" and "R" are all shorter than the minimum, and
 * without the fallback an empty list is read as "match everything".
 */
export function significantWords(phrase: string): string[] {
  const normalized = normalizeForMatch(phrase);

  const words = normalized
    .split(WORD_SEPARATORS)
    .map(stripArabicArticle)
    .filter((word) => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word));

  if (words.length > 0) return words;

  // Nothing significant survived — search on the phrase itself rather than
  // silently matching every job in the feed.
  const wholePhrase = normalized.trim();
  return wholePhrase ? [wholePhrase] : [];
}

// Only strips when a real word is left behind: "الي" must not become "ي".
function stripArabicArticle(word: string): string {
  const stripped = word.replace(ARABIC_DEFINITE_ARTICLE, "");
  return stripped.length >= MIN_WORD_LENGTH ? stripped : word;
}

/**
 * Whether the haystack contains this term.
 *
 * Latin terms must start on a word boundary but may continue: "developer"
 * matches "developers", "engineer" matches "engineering". Requiring a boundary
 * at *both* ends looked tidier and broke real matching — plurals and suffixes
 * stopped matching, and a live scrape returned nothing. The leading boundary is
 * what stops "Go" hitting "Chicago", which was the only real false positive.
 *
 * Arabic is matched as a plain substring: its prefixes and suffixes attach
 * directly to the word, so even a leading boundary would reject valid forms —
 * the same reason the definite article is stripped from the term above.
 */
export function haystackContains(haystack: string, word: string): boolean {
  if (!IS_LATIN_WORD.test(word)) return haystack.includes(word);

  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}`, "u").test(haystack);
}
