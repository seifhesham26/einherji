"use client";

import { FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkType } from "@/lib/scrapers/job-source.types";
import {
  REMOTE_POLICY_LABELS,
  SENIORITY_LABELS,
  remotePolicyValues,
  seniorityLevelValues,
  type RemotePolicy,
  type SeniorityLevel,
} from "@/job-insights/job-insights.validators";

/**
 * The filters that narrow the list beyond its status.
 *
 * Every one of these runs in the database — the whole set is one WHERE clause on
 * an indexed query, not a pass over rows already in the browser. That is what
 * makes "remote, 70+, this week" answerable at five thousand rows, and it is
 * also what makes a saved view worth having.
 */

export interface JobFilterValues {
  isRemote?: boolean;
  minScore?: number;
  postedWithinDays?: number;
  workTypes?: WorkType[];
  // The three that only match analysed postings. Marked in the UI, because a
  // filter that silently excludes everything unread is indistinguishable from a
  // filter that is broken.
  seniorities?: SeniorityLevel[];
  remotePolicies?: RemotePolicy[];
  minAnnualSalary?: number;
}

interface JobFiltersBarProps {
  values: JobFilterValues;
  onChange: (values: JobFilterValues) => void;
}

// "Any" can't be a Select value — an empty string is how Base UI's Select says
// "nothing chosen", so the sentinel has to be a real string that means nothing.
const ANY = "any";

const SCORE_THRESHOLDS = [80, 70, 60, 40];
// Round numbers in whatever currency the postings quote. No conversion happens,
// so this is a threshold against the figure as written.
const SALARY_THRESHOLDS = [200_000, 120_000, 80_000, 60_000, 40_000];
const POSTED_WINDOWS: { days: number; label: string }[] = [
  { days: 1, label: "Today" },
  { days: 3, label: "Last 3 days" },
  { days: 7, label: "This week" },
  { days: 14, label: "Last 2 weeks" },
  { days: 30, label: "This month" },
];

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
  unknown: "Not stated",
};

// Base UI reports a cleared Select as null, and "any" is the sentinel this bar
// uses for the same thing. Both mean the filter is off.
function parseOptionalNumber(value: string | null): number | undefined {
  if (value === null || value === ANY) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function countActiveFilters(values: JobFilterValues): number {
  return [
    values.isRemote,
    values.minScore,
    values.postedWithinDays,
    values.workTypes,
    values.seniorities,
    values.remotePolicies,
    values.minAnnualSalary,
  ].filter((value) => value !== undefined).length;
}

/** True when a filter can only match postings that have been analysed. */
export function usesExtractedFacts(values: JobFilterValues): boolean {
  return (
    values.seniorities !== undefined ||
    values.remotePolicies !== undefined ||
    values.minAnnualSalary !== undefined
  );
}

export default function JobFiltersBar({ values, onChange }: JobFiltersBarProps) {
  const activeCount = countActiveFilters(values);

  // Every control replaces the whole filter object rather than merging into it,
  // so clearing one filter can actually remove the key — a merge would leave
  // `{ minScore: undefined }`, which serialises into a saved view as a filter.
  function update(changes: Partial<JobFilterValues>) {
    const next: JobFilterValues = { ...values, ...changes };
    for (const key of Object.keys(next) as (keyof JobFilterValues)[]) {
      if (next[key] === undefined) delete next[key];
    }
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={values.minScore === undefined ? ANY : String(values.minScore)}
        onValueChange={(value) => update({ minScore: parseOptionalNumber(value) })}
      >
        <SelectTrigger size="sm" className="w-[130px]" aria-label="Minimum score">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any score</SelectItem>
          {SCORE_THRESHOLDS.map((threshold) => (
            <SelectItem key={threshold} value={String(threshold)}>
              {threshold}+
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={values.postedWithinDays === undefined ? ANY : String(values.postedWithinDays)}
        onValueChange={(value) => update({ postedWithinDays: parseOptionalNumber(value) })}
      >
        <SelectTrigger size="sm" className="w-[140px]" aria-label="Posted within">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any time</SelectItem>
          {POSTED_WINDOWS.map((window) => (
            <SelectItem key={window.days} value={String(window.days)}>
              {window.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={values.isRemote === undefined ? ANY : String(values.isRemote)}
        onValueChange={(value) =>
          update({ isRemote: value === ANY || value === null ? undefined : value === "true" })
        }
      >
        <SelectTrigger size="sm" className="w-[130px]" aria-label="Remote or on-site">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Anywhere</SelectItem>
          <SelectItem value="true">Remote only</SelectItem>
          <SelectItem value="false">On-site only</SelectItem>
        </SelectContent>
      </Select>

      <Select
        // One work type at a time. The API takes a list, and picking two
        // non-adjacent employment types is not a question anyone asks.
        value={values.workTypes?.[0] ?? ANY}
        onValueChange={(value) =>
          update({ workTypes: value === ANY || value === null ? undefined : [value as WorkType] })
        }
      >
        <SelectTrigger size="sm" className="w-[140px]" aria-label="Work type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any work type</SelectItem>
          {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((workType) => (
            <SelectItem key={workType} value={workType}>
              {WORK_TYPE_LABELS[workType]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ── Filters on what the AI read out of the description ── */}
      <Select
        value={values.seniorities?.[0] ?? ANY}
        onValueChange={(value) =>
          update({
            seniorities: value === ANY || value === null ? undefined : [value as SeniorityLevel],
          })
        }
      >
        <SelectTrigger size="sm" className="w-[140px]" aria-label="Seniority">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any seniority</SelectItem>
          {seniorityLevelValues
            // "Not stated" is what an analysed posting says when it couldn't
            // tell. Offering it as a filter would return exactly the rows the
            // filter exists to skip past.
            .filter((level) => level !== "unknown")
            .map((level) => (
              <SelectItem key={level} value={level}>
                {SENIORITY_LABELS[level]}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={values.remotePolicies?.[0] ?? ANY}
        onValueChange={(value) =>
          update({
            remotePolicies:
              value === ANY || value === null ? undefined : [value as RemotePolicy],
          })
        }
      >
        <SelectTrigger size="sm" className="w-[150px]" aria-label="What the posting says about remote">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any arrangement</SelectItem>
          {remotePolicyValues
            .filter((policy) => policy !== "unknown")
            .map((policy) => (
              <SelectItem key={policy} value={policy}>
                {REMOTE_POLICY_LABELS[policy]}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={values.minAnnualSalary === undefined ? ANY : String(values.minAnnualSalary)}
        onValueChange={(value) => update({ minAnnualSalary: parseOptionalNumber(value) })}
      >
        <SelectTrigger size="sm" className="w-[150px]" aria-label="Minimum salary">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any salary</SelectItem>
          {SALARY_THRESHOLDS.map((threshold) => (
            <SelectItem key={threshold} value={String(threshold)}>
              {threshold.toLocaleString()}+ a year
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <FilterX className="h-3.5 w-3.5" aria-hidden />
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  );
}
