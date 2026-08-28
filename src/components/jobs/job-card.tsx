"use client";

import {
  Loader2,
  ExternalLink,
  Users,
  MapPin,
  DollarSign,
  Building2,
  Clock,
  PanelRight,
  Check,
  X,
  CircleSlash,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFindManagers } from "@/hooks/jobs/useFindManagers";
import { useSetJobStatus } from "@/hooks/jobs/useSetJobStatus";
import { formatRelativeDate } from "@/utils/format-relative-date";
import { daysSinceLastSeen, isLikelyClosed } from "@/jobs/is-likely-closed";
import { JOB_STATUS_LABELS, jobStatusValues, type JobStatus } from "@/jobs/jobs.validators";
import { QUICK_ACTIONS, getJobStatusDisplay } from "./job-status-display";
import { sourceLabel } from "./job-source-labels";
import JobScoreBadge from "./job-score-badge";
import type { Job } from "@/types/job";

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  /** The keyboard cursor is on this card. Highlighted, not selected. */
  isCursor?: boolean;
  onSelectedChange?: (isSelected: boolean) => void;
  onOpenDetail?: () => void;
  /** Routed up so the reason prompt is owned by the list, not by every card. */
  onRequestDismiss?: () => void;
}

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

export default function JobCard({
  job,
  isSelected = false,
  isCursor = false,
  onSelectedChange,
  onOpenDetail,
  onRequestDismiss,
}: JobCardProps) {
  const findManagers = useFindManagers();
  const setStatus = useSetJobStatus();

  const isFinding = findManagers.isPending && findManagers.variables?.jobId === job.id;
  const isMoving = setStatus.isPending && setStatus.variables?.jobIds.includes(job.id);
  const isSelectable = Boolean(onSelectedChange);

  const status = (job.status ?? "new") as JobStatus;
  const statusDisplay = getJobStatusDisplay(status);
  const quickAction = QUICK_ACTIONS[status];
  const isDismissed = status === "dismissed";

  // The posting has probably come down. Dimmed and labelled rather than hidden:
  // the inference is good, not certain, and a job you can still see is one you
  // can still judge for yourself.
  const looksClosed = isLikelyClosed(job.lastSeenAt);
  const staleDays = daysSinceLastSeen(job.lastSeenAt);

  const alsoOn = job.alsoOnSources ?? [];

  function moveTo(next: JobStatus) {
    setStatus.mutate({ jobIds: [job.id], status: next });
  }

  function dismiss() {
    // Without the list's prompt attached this still has to work — the reason is
    // worth asking for, never worth blocking the action on.
    if (onRequestDismiss) onRequestDismiss();
    else moveTo("dismissed");
  }

  return (
    <Card
      data-job-id={job.id}
      data-selected={isSelected || undefined}
      data-cursor={isCursor || undefined}
      onClick={onOpenDetail}
      className={`flex flex-col rounded-xl transition-all hover:shadow-md data-selected:ring-2 data-selected:ring-primary data-selected:bg-primary/[0.03] data-cursor:ring-2 data-cursor:ring-primary/40 ${
        onOpenDetail ? "cursor-pointer" : ""
      } ${isDismissed || looksClosed ? "opacity-60 hover:opacity-100" : ""}`}
    >
      <CardHeader className="pb-3">
        {/* min-w-0 is load-bearing: this is a grid item, and grid items default
            to min-width:auto, so the flex row below happily overflows the column
            and the status badge gets clipped by the card's overflow-hidden. */}
        <div className="flex items-start gap-3 min-w-0">
          {isSelectable && (
            <span onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelectedChange?.(checked === true)}
                // The card is a grid cell with no other label, so the accessible
                // name has to carry which job this selects.
                aria-label={`Select ${job.title} at ${job.company}`}
                className="mt-1"
              />
            </span>
          )}
          <CompanyAvatar name={job.company} />
          <div className="flex-1 min-w-0">
            {/* The title links out. It was plain text with the only way to the
                posting hidden behind an unlabelled icon in the footer. */}
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-sm leading-tight line-clamp-2 rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {job.title}
            </a>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company}</p>
          </div>

          {/* The score is why this job is where it is in the list, so it sits
              where the eye lands first. */}
          <JobScoreBadge score={job.score} reasons={job.scoreReasons} />
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
          <Badge variant="outline" className={`text-[10px] font-medium ${statusDisplay.badge}`}>
            {statusDisplay.label}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {sourceLabel(job.source)}
          </Badge>
          {/* The same role found on other boards, folded into this row rather
              than listed three times. Worth saying so the user knows why their
              second source reported nothing new. */}
          {alsoOn.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] font-normal"
              title={`Also listed on ${alsoOn.map(sourceLabel).join(", ")}`}
            >
              +{alsoOn.length} more board{alsoOn.length === 1 ? "" : "s"}
            </Badge>
          )}
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
          {looksClosed && (
            <Badge
              variant="outline"
              className="text-[10px] font-normal bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              title={
                staleDays === null
                  ? undefined
                  : `No source has listed this for ${staleDays} days — it may have been filled.`
              }
            >
              May be closed
            </Badge>
          )}
        </div>

        {/* A two-line taste of the description, and nothing more. The expander
            that used to live here grew the card to twice its neighbours' height
            and broke the grid the eye is scanning — the full text belongs in the
            detail panel, which is what the card now opens. */}
        {job.description && (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {job.description}
          </p>
        )}

        {job.notes && (
          <p className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/40 p-2 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {job.notes}
          </p>
        )}

        {/* Required by some sources' API terms — RemoteOK's access is conditional
            on a followed link back, so this must not be nofollow. */}
        {job.attributionText && job.attributionUrl && (
          <a
            href={job.attributionUrl}
            target="_blank"
            rel="noopener"
            onClick={(event) => event.stopPropagation()}
            className="text-[10px] text-muted-foreground hover:text-foreground mt-3 inline-block"
          >
            {job.attributionText}
          </a>
        )}
      </CardContent>

      {/* No pt-0 here. CardFooter's own p-4 is what separates the buttons from
          the border above them. Every control stops the click from reaching the
          card, which would otherwise open the panel behind the action. */}
      <CardFooter className="flex-col items-stretch gap-2" onClick={(event) => event.stopPropagation()}>
        <div className="flex gap-2">
          {/* The keep decision. One button, because triage is a binary and a menu
              of ten transitions on every card is how a list stops being usable. */}
          {quickAction ? (
            <Button
              size="sm"
              className="flex-1"
              disabled={isMoving}
              onClick={() => moveTo(quickAction.next)}
            >
              {isMoving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              {quickAction.label}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={isMoving}
              onClick={() => moveTo("new")}
            >
              <CircleSlash className="h-3.5 w-3.5" aria-hidden />
              Reopen
            </Button>
          )}

          {/* The drop decision. Dismissed keeps the row — so the next scrape
              doesn't hand it back as new — while taking it out of the list. */}
          {!isDismissed && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isMoving}
              onClick={dismiss}
              aria-label={`Dismiss ${job.title} at ${job.company}`}
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}

          {/* The keyboard path is Enter on the highlighted card; this is the same
              door for anyone using a mouse or a screen reader. */}
          {onOpenDetail && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpenDetail}
              aria-label={`Open details for ${job.title} at ${job.company}`}
              title="Details"
            >
              <PanelRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}

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
        </div>

        <div className="flex gap-2">
          {/* Everything the two buttons above don't cover. */}
          <Select value={status} onValueChange={(next) => moveTo(next as JobStatus)}>
            <SelectTrigger
              size="sm"
              className="flex-1 text-xs"
              aria-label={`Change status of ${job.title} at ${job.company}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jobStatusValues.map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {JOB_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Demoted from the primary action it used to be: it needs an Apify
              token and a LinkedIn session the app won't use, so it fails for
              almost everyone. Kept because it still works with a token. */}
          <Button
            size="sm"
            variant="ghost"
            disabled={isFinding}
            onClick={() => findManagers.mutate({ jobId: job.id })}
            aria-label={`Find a hiring manager for ${job.title} at ${job.company}`}
            title="Find hiring manager"
          >
            {isFinding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Users className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        </div>
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
