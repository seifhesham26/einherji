import {
  dedupeBySourceJobId,
  type JobSearchQuery,
  type JobSourceName,
  type ScrapedJob,
} from "../job-source.types";
import { fetchAdzunaJobs } from "./adzuna";
import { arbeitnowSource } from "./arbeitnow";
import { freelancerSource } from "./freelancer";
import { hackerNewsFreelanceSource, hackerNewsSource } from "./hackernews";
import { himalayasSource } from "./himalayas";
import { jobicySource } from "./jobicy";
import { fetchRedditJobs } from "./reddit";
import { remoteOkSource } from "./remoteok";
import { theMuseSource } from "./themuse";
import { fetchTwitterJobs } from "./twitter";
import { weWorkRemotelySource } from "./weworkremotely";

// Sources that need nothing but a network connection.
const FREE_AGGREGATORS = [
  remoteOkSource,
  arbeitnowSource,
  jobicySource,
  theMuseSource,
  himalayasSource,
  weWorkRemotelySource,
  hackerNewsSource,
  hackerNewsFreelanceSource,
  freelancerSource,
];

const FREE_AGGREGATORS_BY_NAME = new Map(
  FREE_AGGREGATORS.map((source) => [source.name, source]),
);

// Sources that stay dormant until the user saves a key in Settings. Each reads
// the fields its own registry entry declares.
type CredentialedFetcher = (
  credentials: Record<string, string>,
  query: JobSearchQuery,
  signal?: AbortSignal,
) => Promise<ScrapedJob[]>;

const CREDENTIALED_AGGREGATORS: Partial<Record<JobSourceName, CredentialedFetcher>> = {
  adzuna: (credentials, query, signal) =>
    fetchAdzunaJobs({ appId: credentials.appId, apiKey: credentials.apiKey }, query, signal),
  reddit: (credentials, query, signal) =>
    fetchRedditJobs(
      { clientId: credentials.clientId, clientSecret: credentials.clientSecret },
      query,
      signal,
    ),
  twitter: (credentials, query, signal) =>
    fetchTwitterJobs({ bearerToken: credentials.bearerToken }, query, signal),
};

export function isAggregatorSource(source: JobSourceName): boolean {
  return FREE_AGGREGATORS_BY_NAME.has(source) || source in CREDENTIALED_AGGREGATORS;
}

export function aggregatorNeedsCredentials(source: JobSourceName): boolean {
  return source in CREDENTIALED_AGGREGATORS;
}

/**
 * Runs one aggregator.
 *
 * Returns an empty array rather than throwing when a credentialed source has no
 * key — a missing key is a configuration state, not an error, and shouldn't
 * appear as a failed scrape.
 */
export async function fetchAggregatorJobs(
  source: JobSourceName,
  query: JobSearchQuery,
  credentials: Record<string, string> | null,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const freeSource = FREE_AGGREGATORS_BY_NAME.get(source);
  // Deduped here rather than in each adapter: paginated feeds overlap, and every
  // source funnels through this one call.
  if (freeSource) return dedupeBySourceJobId(await freeSource.fetchJobs(query, signal));

  const credentialedFetcher = CREDENTIALED_AGGREGATORS[source];
  if (!credentialedFetcher) return [];
  if (!credentials || Object.keys(credentials).length === 0) return [];

  return dedupeBySourceJobId(await credentialedFetcher(credentials, query, signal));
}

export const AGGREGATOR_SOURCE_NAMES: JobSourceName[] = [
  ...FREE_AGGREGATORS.map((source) => source.name),
  ...(Object.keys(CREDENTIALED_AGGREGATORS) as JobSourceName[]),
];
