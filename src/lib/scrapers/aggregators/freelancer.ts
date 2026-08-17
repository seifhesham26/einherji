import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { matchesQuery } from "./match-query";

const FREELANCER_API_URL = "https://www.freelancer.com/api/projects/0.1/projects/active";
const PROJECT_LIMIT = 50;

const freelancerProjectSchema = z.object({
  id: z.number(),
  title: z.string(),
  seo_url: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  preview_description: z.string().nullable().optional(),
  submitdate: z.number().nullable().optional(),
  type: z.string().nullable().optional(),
  currency: z.object({ code: z.string().nullable().optional() }).nullable().optional(),
  budget: z
    .object({
      minimum: z.number().nullable().optional(),
      maximum: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  jobs: z
    .array(z.object({ name: z.string() }))
    .nullable()
    .optional(),
});

const freelancerResponseSchema = z.object({
  status: z.string(),
  result: z.object({ projects: z.array(z.unknown()).nullable().optional() }),
});

export const freelancerSource: AggregatorSource = {
  name: "freelancer",
  fetchJobs: async (query, signal) => {
    const payload = await atsRateLimiter.schedule(() =>
      fetchJson(
        `${FREELANCER_API_URL}/?limit=${PROJECT_LIMIT}&job_details=true&full_description=true`,
        { signal },
      ),
    );

    const parsed = freelancerResponseSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.result.projects) return [];

    return parseArrayLeniently(parsed.data.result.projects, freelancerProjectSchema)
      .map((project) => {
        const skills = (project.jobs ?? []).map((job) => job.name);

        return parseScrapedJob({
          sourceJobId: String(project.id),
          source: "freelancer",
          title: project.title,
          // Freelancer.com doesn't expose the client's name on public listings,
          // so the skill category is the most useful stand-in for the UI.
          company: skills[0] ? `Freelancer.com · ${skills[0]}` : "Freelancer.com",
          jobUrl: project.seo_url
            ? `https://www.freelancer.com/projects/${project.seo_url}`
            : `https://www.freelancer.com/projects/${project.id}`,
          companyUrl: null,
          location: "Remote",
          salary: formatBudget(project.budget, project.currency?.code, project.type),
          description: project.description ?? project.preview_description ?? null,
          // submitdate is epoch seconds.
          postedAt: project.submitdate ? new Date(project.submitdate * 1000) : null,
          workType: "freelance",
          isRemote: true,
          tags: skills.length > 0 ? skills : null,
        });
      })
      .filter((job): job is ScrapedJob => job !== null)
      .filter((job) => matchesQuery(job, query));
  },
};

function formatBudget(
  budget: { minimum?: number | null; maximum?: number | null } | null | undefined,
  currencyCode?: string | null,
  projectType?: string | null,
): string | null {
  if (!budget?.minimum && !budget?.maximum) return null;

  const currency = currencyCode ?? "USD";
  // Hourly projects quote a rate, fixed projects quote a total — labelling the
  // difference matters when comparing gigs.
  const suffix = projectType === "hourly" ? "/hr" : "";

  if (budget.minimum && budget.maximum) {
    return `${currency} ${budget.minimum.toLocaleString()} – ${budget.maximum.toLocaleString()}${suffix}`;
  }
  return `${currency} ${(budget.minimum ?? budget.maximum)!.toLocaleString()}${suffix}`;
}
