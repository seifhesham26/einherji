import type { JobSourceName } from "./job-source.types";

// How a source finds work, which decides what inputs a scrape run needs.
export type SourceTier =
  // Needs a company slug from tracked_companies
  | "company_board"
  // Keyword-searchable on its own, no company list required
  | "aggregator"
  // Freelance / project marketplaces
  | "marketplace"
  // Scraped HTML rather than an API
  | "scraped";

export interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  isSecret: boolean;
}

export interface SourceDefinition {
  id: JobSourceName;
  name: string;
  tier: SourceTier;
  description: string;
  // Where to get a key, shown next to the credential inputs.
  signupUrl?: string;
  // Empty means the source works with no configuration at all.
  credentialFields: CredentialField[];
  // Sites that serve a JS shell or block datacenter IPs. Only attempted when the
  // user has configured an unblocking proxy in Settings.
  requiresProxy?: boolean;
  // Sources whose terms require visible attribution wherever their data appears.
  attribution?: { text: string; url: string };
  costNote?: string;
}

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  // ─── Company boards ─────────────────────────────────────────────────────────
  {
    id: "greenhouse",
    name: "Greenhouse",
    tier: "company_board",
    description: "Public job board API. Free, no key, no rate limits.",
    credentialFields: [],
  },
  {
    id: "lever",
    name: "Lever",
    tier: "company_board",
    description: "Public job board API. Free, no key.",
    credentialFields: [],
  },
  {
    id: "ashby",
    name: "Ashby",
    tier: "company_board",
    description: "Public job board API. Richest data of the boards.",
    credentialFields: [],
  },
  {
    id: "workable",
    name: "Workable",
    tier: "company_board",
    description: "Public job board API. Free, no key.",
    credentialFields: [],
  },
  {
    id: "smartrecruiters",
    name: "SmartRecruiters",
    tier: "company_board",
    description: "Public postings API. Common at larger enterprises.",
    credentialFields: [],
  },
  {
    id: "rippling",
    name: "Rippling ATS",
    tier: "company_board",
    description: "Public board API. Common at newer startups.",
    credentialFields: [],
  },

  // ─── Aggregators ────────────────────────────────────────────────────────────
  {
    id: "remoteok",
    name: "RemoteOK",
    tier: "aggregator",
    description: "Large remote-only board. Free, no key.",
    credentialFields: [],
    // Their API terms make a followed link back a condition of access.
    attribution: { text: "Jobs by RemoteOK", url: "https://remoteok.com" },
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    tier: "aggregator",
    description: "Large EU-heavy board with visa-sponsorship flags. Free.",
    credentialFields: [],
  },
  {
    id: "jobicy",
    name: "Jobicy",
    tier: "aggregator",
    description: "Remote jobs with level and geo filters. Free.",
    credentialFields: [],
  },
  {
    id: "themuse",
    name: "The Muse",
    tier: "aggregator",
    description: "Established brands, with seniority levels. Free.",
    credentialFields: [],
  },
  {
    id: "himalayas",
    name: "Himalayas",
    tier: "aggregator",
    description: "Remote roles with salary ranges. Free.",
    credentialFields: [],
  },
  {
    id: "weworkremotely",
    name: "We Work Remotely",
    tier: "aggregator",
    description: "Long-running remote board, via RSS. Free.",
    credentialFields: [],
  },
  {
    id: "hackernews",
    name: "HN — Who is Hiring",
    tier: "aggregator",
    description: "The monthly thread, parsed into jobs. Strong for startups.",
    credentialFields: [],
  },

  // ─── Freelance / client work ────────────────────────────────────────────────
  {
    id: "freelancer",
    name: "Freelancer.com",
    tier: "marketplace",
    description: "Live project listings. Free, no key. Good for web/mobile gigs.",
    credentialFields: [],
  },
  {
    id: "hackernews_freelance",
    name: "HN — Seeking Freelancer",
    tier: "marketplace",
    description: "The monthly freelance thread. High-quality client leads.",
    credentialFields: [],
  },

  // ─── Credentialed ───────────────────────────────────────────────────────────
  {
    id: "adzuna",
    name: "Adzuna",
    tier: "aggregator",
    description:
      "Aggregates many boards including Indeed-style listings. The practical stand-in for Indeed, which has no public API.",
    signupUrl: "https://developer.adzuna.com/signup",
    credentialFields: [
      { key: "appId", label: "App ID", placeholder: "12ab34cd", isSecret: false },
      { key: "apiKey", label: "API Key", placeholder: "aBcD…", isSecret: true },
    ],
    costNote: "Free tier available",
  },
  {
    id: "reddit",
    name: "Reddit",
    tier: "aggregator",
    description:
      "r/forhire, r/jobbit and similar. Needs a free OAuth app — the public JSON endpoints now reject unauthenticated traffic.",
    signupUrl: "https://www.reddit.com/prefs/apps",
    credentialFields: [
      { key: "clientId", label: "Client ID", placeholder: "abc123", isSecret: false },
      { key: "clientSecret", label: "Client Secret", placeholder: "…", isSecret: true },
    ],
    costNote: "Free — 100 queries/min with an OAuth app",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    tier: "aggregator",
    description: "Recent-search for hiring and freelance posts.",
    signupUrl: "https://developer.x.com",
    credentialFields: [
      { key: "bearerToken", label: "Bearer Token", placeholder: "AAAA…", isSecret: true },
    ],
    costNote: "Paid — Basic tier is roughly $100/mo",
  },
  {
    id: "serpapi",
    name: "Search (SerpAPI)",
    tier: "aggregator",
    description:
      "Google Jobs results, plus profile lookup for lead discovery without touching LinkedIn.",
    signupUrl: "https://serpapi.com/users/sign_up",
    credentialFields: [
      { key: "apiKey", label: "API Key", placeholder: "…", isSecret: true },
    ],
    costNote: "Free tier, then paid per search",
  },

  // ─── Scraped ────────────────────────────────────────────────────────────────
  {
    id: "linkedin_guest",
    name: "LinkedIn",
    tier: "scraped",
    description: "Logged-out public search. Broad, but rate-limited by IP.",
    credentialFields: [],
  },
  {
    id: "apify",
    name: "Apify (legacy)",
    tier: "scraped",
    description: "Paid third-party scraper. Still used for hiring-manager lookup.",
    credentialFields: [],
    costNote: "Paid per run",
  },
];

const DEFINITIONS_BY_ID = new Map(SOURCE_DEFINITIONS.map((source) => [source.id, source]));

export function getSourceDefinition(sourceId: JobSourceName): SourceDefinition | null {
  return DEFINITIONS_BY_ID.get(sourceId) ?? null;
}

export function getSourcesByTier(tier: SourceTier): SourceDefinition[] {
  return SOURCE_DEFINITIONS.filter((source) => source.tier === tier);
}

export function sourceNeedsCredentials(sourceId: JobSourceName): boolean {
  return (DEFINITIONS_BY_ID.get(sourceId)?.credentialFields.length ?? 0) > 0;
}
