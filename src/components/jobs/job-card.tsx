"use client";

import { useState } from "react";
import {
  Loader2,
  ExternalLink,
  Users,
  MapPin,
  DollarSign,
  Building2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useFindManagers } from "@/hooks/jobs/useFindManagers";
import { formatRelativeDate } from "@/utils/format-relative-date";
import type { Job } from "@/types/job";

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelectedChange?: (isSelected: boolean) => void;
}

// Short display names — the raw enum values are snake_case and look like internals.
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

function CompanyAvatar({ name }: { name: string }) {
  const letter = name[0]?.toUpperCase() ?? "?";
  return (
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary" aria-hidden>
        {letter}
      </span>
    </div>
  );
}

export default function JobCard({ job, isSelected = false, onSelectedChange }: JobCardProps) {
  const findManagers = useFindManagers();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const isFinding = findManagers.isPending && findManagers.variables?.jobId === job.id;
  const isSelectable = Boolean(onSelectedChange);

  return (
    <Card
      data-selected={isSelected || undefined}
      className="flex flex-col rounded-xl transition-all hover:shadow-md data-selected:ring-2 data-selected:ring-primary data-selected:bg-primary/[0.03]"
    >
      <CardHeader className="pb-3">
        {/* min-w-0 is load-bearing: this is a grid item, and grid items default
            to min-width:auto, so the flex row below happily overflows the column
            and the status badge gets clipped by the card's overflow-hidden. */}
        <div className="flex items-start gap-3 min-w-0">
          {isSelectable && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
              // The card is a grid cell with no other label, so the accessible
              // name has to carry which job this selects.
              aria-label={`Select ${job.title} at ${job.company}`}
              className="mt-1"
            />
          )}
          <CompanyAvatar name={job.company} />
          <div className="flex-1 min-w-0">
            {/* The title links out. It was plain text with the only way to the
                posting hidden behind an unlabelled icon in the footer. */}
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm leading-tight line-clamp-2 rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {job.title}
            </a>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company}</p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs ${
              job.isProcessed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {job.isProcessed ? "Done" : "Pending"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <div className="space-y-1.5">
          {job.location && (
            <MetaRow icon={<MapPin className="h-3 w-3 shrink-0" />} label="Location">
              {job.location}
            </MetaRow>
          )}
          {job.salary && (
            <MetaRow icon={<DollarSign className="h-3 w-3 shrink-0" />} label="Salary">
              {job.salary}
            </MetaRow>
          )}
          {job.companySize && (
            <MetaRow icon={<Building2 className="h-3 w-3 shrink-0" />} label="Company size">
              {job.companySize} employees
            </MetaRow>
          )}
          <MetaRow icon={<Clock className="h-3 w-3 shrink-0" />} label="Posted">
            {formatRelativeDate(job.postedAt)}
          </MetaRow>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <Badge variant="secondary" className="text-[10px] font-normal">
            {SOURCE_LABELS[job.source] ?? job.source}
          </Badge>
          {job.workType && job.workType !== "unknown" && (
            <Badge variant="outline" className="text-[10px] font-normal capitalize">
              {job.workType.replace("_", " ")}
            </Badge>
          )}
          {job.isRemote && (
            <Badge
              variant="outline"
              className="text-[10px] font-normal bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
            >
              Remote
            </Badge>
          )}
        </div>

        {/* Scraped and stored on every job, and never once shown — deciding
            whether a role is worth a manager lookup meant opening the posting. */}
        {job.description && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsDescriptionOpen((isOpen) => !isOpen)}
              aria-expanded={isDescriptionOpen}
              className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${isDescriptionOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
              {isDescriptionOpen ? "Hide description" : "Read description"}
            </button>
            {isDescriptionOpen && (
              <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                {job.description}
              </p>
            )}
          </div>
        )}

        {/* Required by some sources' API terms — RemoteOK's access is conditional
            on a followed link back, so this must not be nofollow. */}
        {job.attributionText && job.attributionUrl && (
          <a
            href={job.attributionUrl}
            target="_blank"
            rel="noopener"
            className="text-[10px] text-muted-foreground hover:text-foreground mt-3 inline-block"
          >
            {job.attributionText}
          </a>
        )}
      </CardContent>

      {/* No pt-0 here. CardFooter's own p-4 is what separates the buttons from
          the border above them — overriding it sat "Find manager" flush against
          the rule, which read as a rendering bug. */}
      <CardFooter className="gap-2">
        <Button
          size="sm"
          variant={job.isProcessed ? "secondary" : "outline"}
          className="flex-1"
          disabled={(job.isProcessed ?? false) || isFinding}
          onClick={() => findManagers.mutate({ jobId: job.id })}
        >
          {isFinding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Users className="h-3.5 w-3.5" aria-hidden />
          )}
          {job.isProcessed ? "Manager found" : "Find manager"}
        </Button>
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
          // Icon-only: without a name this announced as "link" and nothing else.
          aria-label={`Open the ${job.title} posting at ${job.company} in a new tab`}
          title="Open posting"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </CardFooter>
    </Card>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden>{icon}</span>
      {/* The icon carries the meaning visually; this carries it to everyone else. */}
      <span className="sr-only">{label}:</span>
      <span className="truncate">{children}</span>
    </div>
  );
}
