import type { JobSourceName, ScrapedJob } from "../job-source.types";
import { fetchAshbyJobs } from "./ashby";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchRipplingJobs } from "./rippling";
import { fetchSmartRecruitersJobs } from "./smartrecruiters";
import { fetchWorkableJobs } from "./workable";

export type AtsProvider = Extract<
  JobSourceName,
  "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters" | "rippling"
>;

type AtsFetcher = (
  slug: string,
  companyName: string,
  signal?: AbortSignal,
) => Promise<ScrapedJob[]>;

const ATS_FETCHERS: Record<AtsProvider, AtsFetcher> = {
  greenhouse: fetchGreenhouseJobs,
  lever: fetchLeverJobs,
  ashby: fetchAshbyJobs,
  workable: fetchWorkableJobs,
  smartrecruiters: fetchSmartRecruitersJobs,
  rippling: fetchRipplingJobs,
};

export function fetchAtsJobs(
  provider: AtsProvider,
  slug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  return ATS_FETCHERS[provider](slug, companyName, signal);
}

export function isAtsProvider(value: string): value is AtsProvider {
  return value in ATS_FETCHERS;
}

export const ATS_PROVIDERS = Object.keys(ATS_FETCHERS) as AtsProvider[];
