"use client";

import { Check, CircleMinus, CircleSlash, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetFitReport } from "@/hooks/job-insights/useGetFitReport";
import { useGenerateFitReport } from "@/hooks/job-insights/useGenerateFitReport";
import {
  FIT_VERDICT_LABELS,
  type FitRequirement,
  type FitVerdict,
} from "@/job-insights/job-insights.validators";

/**
 * What the model thinks of this posting against your CV.
 *
 * Requirement by requirement, with the evidence on show. A percentage on its own
 * is a number you have no reason to believe — the row that says "Kubernetes:
 * missing, nothing in the CV" is the part that is actually worth reading, and
 * it's what lets you disagree with the headline rather than just distrust it.
 *
 * Never generated on open. It costs a completion, so it is asked for.
 */

// Above this, applying is worth the hour. Below the lower one it usually isn't,
// and saying so is the whole point of running the report.
const STRONG_MATCH = 70;
const WEAK_MATCH = 40;

const VERDICT_STYLES: Record<FitVerdict, { icon: React.ReactNode; className: string }> = {
  met: {
    icon: <Check className="h-3.5 w-3.5" aria-hidden />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  partial: {
    icon: <CircleMinus className="h-3.5 w-3.5" aria-hidden />,
    className: "text-amber-600 dark:text-amber-400",
  },
  missing: {
    icon: <CircleSlash className="h-3.5 w-3.5" aria-hidden />,
    className: "text-red-600 dark:text-red-400",
  },
};

function matchTone(matchPercent: number): string {
  if (matchPercent >= STRONG_MATCH) return "text-emerald-600 dark:text-emerald-400";
  if (matchPercent >= WEAK_MATCH) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function JobFitReport({ jobId }: { jobId: string }) {
  const { data: report, isLoading } = useGetFitReport(jobId);
  const generateReport = useGenerateFitReport();

  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;

  if (!report) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Read this posting against your CV — requirement by requirement, with what you&apos;re
          missing and what to lead with.
        </p>
        <Button
          size="sm"
          className="mt-3"
          disabled={generateReport.isPending}
          onClick={() => generateReport.mutate({ jobId, regenerate: false })}
        >
          {generateReport.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          Check my fit
        </Button>
      </div>
    );
  }

  const requirements = report.requirements as FitRequirement[];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <p className={`text-2xl font-semibold tabular-nums ${matchTone(report.matchPercent)}`}>
          {report.matchPercent}
          <span className="text-sm font-normal">%</span>
        </p>
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{report.summary}</p>
        <Button
          size="sm"
          variant="ghost"
          disabled={generateReport.isPending}
          onClick={() => generateReport.mutate({ jobId, regenerate: true })}
          aria-label="Run the fit report again"
          title="Run again"
        >
          {generateReport.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
        </Button>
      </div>

      <ul className="space-y-1.5">
        {requirements.map((requirement, index) => {
          const style = VERDICT_STYLES[requirement.verdict];

          return (
            <li key={`${requirement.requirement}-${index}`} className="flex gap-2 text-xs">
              <span className={`mt-0.5 shrink-0 ${style.className}`} title={FIT_VERDICT_LABELS[requirement.verdict]}>
                {style.icon}
                <span className="sr-only">{FIT_VERDICT_LABELS[requirement.verdict]}:</span>
              </span>
              <div className="min-w-0">
                <p className="font-medium">{requirement.requirement}</p>
                {/* The evidence is the point. A verdict with nothing behind it is
                    a claim, and the model was told to say "missing" instead. */}
                {requirement.evidence && (
                  <p className="text-muted-foreground">{requirement.evidence}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {report.gaps.length > 0 && (
        <FactList title="Gaps" items={report.gaps} />
      )}
      {report.emphasise.length > 0 && (
        <FactList title="Lead with" items={report.emphasise} />
      )}

      <p className="text-[11px] text-muted-foreground/70">
        Written by {report.model}. It only knows your CV — check it before you trust it.
      </p>
    </div>
  );
}

function FactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-xs text-muted-foreground">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
