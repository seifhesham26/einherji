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
  | "scraped"
  // Not a source of listings at all — businesses to approach. Searched live and
  // shown to the user; nothing is stored until they save a contact, because
  // Google's terms don't allow caching the display fields.
  | "places";

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
    // Reddit's Responsible Builder Policy requires explicit approval before any
    // API access, separate written approval for commercial use, and forbids
    // sharing Reddit data with third parties. Message generation sends the job
    // description to OpenRouter, so this source can't be used as the app is built
    // without that approval. Code is kept and working for if approval is granted.
    description:
      "r/forhire, r/jobbit and similar. Requires Reddit's written approval before use — see docs/paid-services/README.md.",
    signupUrl: "https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy",
    credentialFields: [
      { key: "clientId", label: "Client ID", placeholder: "abc123", isSecret: false },
      { key: "clientSecret", label: "Client Secret", placeholder: "…", isSecret: true },
    ],
    costNote: "Approval required — not usable without it",
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
    id: "google_places",
    name: "Google Places",
    tier: "places",
    // Not a job source. Businesses to sell to — the supply side of a "clients"
    // or "suppliers" bucket rather than a feed of listings.
    description:
      "Find businesses by what they do and where they are. Searched live and shown to you; nothing is stored until you save a contact.",
    signupUrl: "https://console.cloud.google.com/apis/library/places-backend.googleapis.com",
    credentialFields: [
      { key: "apiKey", label: "API Key", placeholder: "AIza…", isSecret: true },
    ],
    costNote: "Pay as you go — needs a card on Google Cloud",
  },
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
