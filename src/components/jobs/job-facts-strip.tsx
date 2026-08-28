"use client";

import { Loader2, ScanText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalyseJob } from "@/hooks/job-insights/useAnalyseJob";
import {
  REMOTE_POLICY_LABELS,
  SENIORITY_LABELS,
  type RemotePolicy,
  type SeniorityLevel,
} from "@/job-insights/job-insights.validators";
import type { Job } from "@/types/job";

/**
 * What was read out of the description, once.
 *
 * These are the same values the list filters on, shown here so a filter that
 * excluded a job can be checked against what the model actually decided. A
 * posting that has never been analysed says so and offers the button, rather
 * than showing an empty row that looks like a bug.
 */
export default function JobFactsStrip({ job }: { job: Job }) {
  const analyseJob = useAnalyseJob();

  const hasDescription = Boolean(job.description && job.description.length > 0);

  if (!job.factsExtractedAt) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
        <p className="flex-1 text-xs text-muted-foreground">
          {hasDescription
            ? "This posting hasn't been read yet. One pass pulls out the seniority, the real salary and the remote policy — and turns them into filters."
            : "This source didn't include a description, so there's nothing to read."}
        </p>
        {hasDescription && (
          <Button
            size="sm"
            variant="outline"
            disabled={analyseJob.isPending}
            onClick={() => analyseJob.mutate({ jobId: job.id })}
          >
            {analyseJob.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ScanText className="h-3.5 w-3.5" aria-hidden />
            )}
            Analyse
          </Button>
        )}
      </div>
    );
  }

  const salary = formatSalaryBand(job.salaryMinAnnual, job.salaryMaxAnnual, job.salaryCurrency);
  const techStack = job.techStack ?? [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {job.seniority && job.seniority !== "unknown" && (
          <Fact label={SENIORITY_LABELS[job.seniority as SeniorityLevel]} />
        )}
        {job.yearsExperienceMin !== null && (
          <Fact label={`${job.yearsExperienceMin}+ years`} />
        )}
        {job.remotePolicy && job.remotePolicy !== "unknown" && (
          <Fact label={REMOTE_POLICY_LABELS[job.remotePolicy as RemotePolicy]} />
        )}
        {salary && <Fact label={salary} />}
        {/* Only stated either way. Null is silence, and silence is the normal
            answer — showing "no sponsorship" for it would be a claim the posting
            never made. */}
        {job.offersVisaSponsorship === true && <Fact label="Visa sponsorship" />}
        {job.offersVisaSponsorship === false && <Fact label="No sponsorship" />}
        {job.postingLanguage && job.postingLanguage !== "en" && (
          <Fact label={`Written in ${job.postingLanguage.toUpperCase()}`} />
        )}
      </div>

      {techStack.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {techStack.map((technology) => (
            <Badge key={technology} variant="secondary" className="text-[10px] font-normal">
              {technology}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="text-[10px] font-normal">
      {label}
    </Badge>
  );
}

/**
 * The band, on one scale, with its currency shown rather than converted.
 *
 * No FX rates exist in this app, so a figure in EGP and a figure in USD are two
 * different numbers that happen to share a column. Printing the code is the
 * honest version of that.
 */
function formatSalaryBand(
  minAnnual: number | null,
  maxAnnual: number | null,
  currency: string | null,
): string | null {
  if (minAnnual === null && maxAnnual === null) return null;

  const code = currency ? `${currency} ` : "";
  const format = (value: number) => value.toLocaleString();

  if (minAnnual !== null && maxAnnual !== null && minAnnual !== maxAnnual) {
    return `${code}${format(minAnnual)}–${format(maxAnnual)} a year`;
  }

  return `${code}${format(maxAnnual ?? minAnnual ?? 0)} a year`;
}
