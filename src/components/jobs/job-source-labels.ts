/**
 * Display names for job sources.
 *
 * The raw enum values are snake_case and read like internals — "hackernews_freelance"
 * is not a thing to show anyone. Shared by the card, the dense table and the
 * detail panel, because three copies of this map is three chances for one board
 * to be renamed in two places.
 */
const SOURCE_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  rippling: "Rippling",
  remoteok: "RemoteOK",
  arbeitnow: "Arbeitnow",
  jobicy: "Jobicy",
  themuse: "The Muse",
  himalayas: "Himalayas",
  weworkremotely: "WeWorkRemotely",
  hackernews: "Hacker News",
  hackernews_freelance: "HN Freelance",
  wuzzuf: "Wuzzuf",
  freelancer: "Freelancer.com",
  adzuna: "Adzuna",
  reddit: "Reddit",
  twitter: "X",
  serpapi: "Google Jobs",
  google_places: "Google Places",
  linkedin_guest: "LinkedIn",
  apify: "Apify",
};

/** Falls back to the raw value: a source added to the registry and not to this map still renders. */
export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
