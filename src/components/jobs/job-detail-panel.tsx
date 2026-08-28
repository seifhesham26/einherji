"use client";

import {
  Building2,
  Check,
  CircleSlash,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  VolumeX,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetJobDetail } from "@/hooks/jobs/useGetJobDetail";
import { useSetJobStatus } from "@/hooks/jobs/useSetJobStatus";
import { useCreateMuteRule } from "@/hooks/mute-rules/useCreateMuteRule";
import { formatRelativeDate } from "@/utils/format-relative-date";
import { daysSinceLastSeen, isLikelyClosed } from "@/jobs/is-likely-closed";
import { JOB_STATUS_LABELS, jobStatusValues, type JobStatus } from "@/jobs/jobs.validators";
import { QUICK_ACTIONS, getJobStatusDisplay } from "./job-status-display";
import { sourceLabel } from "./job-source-labels";
import JobScoreBadge from "./job-score-badge";
import JobTimeline from "./job-timeline";
import JobNotesEditor from "./job-notes-editor";

interface JobDetailPanelProps {
  jobId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Routed up so the reason dialog is owned by the list, not by every panel. */
  onRequestDismiss: (jobId: string, label: string) => void;
}

/**
 * Everything about one job, in one place.
 *
 * A card can hold a summary or it can hold a description, and stretching one to
 * hold both makes it twice the height of its neighbours and breaks the grid the
 * eye is scanning. The panel is where the full text, the history, the notes and
 * the company's other openings live — and it opens on Enter, so reading a job
 * properly costs one key press.
 */
export default function JobDetailPanel({
  jobId,
  onOpenChange,
  onRequestDismiss,
}: JobDetailPanelProps) {
  const { data, isLoading } = useGetJobDetail(jobId);
  const setStatus = useSetJobStatus();
  const createMuteRule = useCreateMuteRule();

  const job = data?.job;
  const status = (job?.status ?? "new") as JobStatus;
  const quickAction = QUICK_ACTIONS[status];
  const statusDisplay = getJobStatusDisplay(status);
  const looksClosed = job ? isLikelyClosed(job.lastSeenAt) : false;
  const staleDays = job ? daysSinceLastSeen(job.lastSeenAt) : null;
  const alsoOn = job?.alsoOnSources ?? [];

  function moveTo(next: JobStatus) {
    if (!job) return;
    setStatus.mutate({ jobIds: [job.id], status: next });
  }

  return (
    <Dialog open={jobId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {isLoading || !job || !data ? (
          <div className="space-y-3">
            {/* The dialog needs a title before the data arrives, or its
                accessible name is empty for as long as the request takes. */}
            <DialogTitle className="sr-only">Loading job</DialogTitle>
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2 pr-8">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base leading-snug">{job.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
                </div>
                <JobScoreBadge score={job.score} reasons={job.scoreReasons} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium ${statusDisplay.badge}`}
                >
                  {statusDisplay.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {sourceLabel(job.source)}
                </Badge>
                {alsoOn.map((source) => (
                  <Badge key={source} variant="outline" className="text-[10px] font-normal">
                    {sourceLabel(source)}
                  </Badge>
                ))}
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
                  >
                    May be closed
                    {staleDays !== null && ` · unseen ${staleDays}d`}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions sit above the description, not below it: the decision is
                the point of opening this, and burying the buttons under two
                thousand words of job text means scrolling to make it. */}
            <div className="flex flex-wrap items-center gap-2">
              {quickAction ? (
                <Button
                  size="sm"
                  disabled={setStatus.isPending}
                  onClick={() => moveTo(quickAction.next)}
                >
                  {setStatus.isPending ? (
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
                  disabled={setStatus.isPending}
                  onClick={() => moveTo("new")}
                >
                  <CircleSlash className="h-3.5 w-3.5" aria-hidden />
                  Reopen
                </Button>
              )}

              {status !== "dismissed" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRequestDismiss(job.id, `${job.title} at ${job.company}`)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Dismiss
                </Button>
              )}

              <Select value={status} onValueChange={(next) => moveTo(next as JobStatus)}>
                <SelectTrigger size="sm" className="w-[150px] text-xs" aria-label="Change status">
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

              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Open posting
              </a>

              {/* The recurring-agency problem, solved where you notice it. One
                  click here is what stops the fortieth listing from the same
                  staffing firm. */}
              <Button
                size="sm"
                variant="ghost"
                disabled={createMuteRule.isPending}
                onClick={() =>
                  createMuteRule.mutate({
                    kind: "company",
                    pattern: job.company,
                    dismissExisting: true,
                  })
                }
                title={`Never show jobs from ${job.company} again`}
              >
                <VolumeX className="h-3.5 w-3.5" aria-hidden />
                Mute company
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
              <DetailFact icon={<MapPin className="h-3 w-3" />} label="Location">
                {job.location ?? "Not stated"}
              </DetailFact>
              <DetailFact icon={<DollarSign className="h-3 w-3" />} label="Salary">
                {job.salary ?? "Not stated"}
              </DetailFact>
              <DetailFact icon={<Building2 className="h-3 w-3" />} label="Work type">
                {job.workType === "unknown" ? "Not stated" : job.workType.replace("_", " ")}
              </DetailFact>
              <DetailFact icon={<Clock className="h-3 w-3" />} label="Posted">
                {formatRelativeDate(job.postedAt)}
              </DetailFact>
            </div>

            <Separator />

            <Section title="Description">
              {job.description ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {job.description}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This source didn&apos;t include one. Open the posting to read it.
                </p>
              )}
            </Section>

            <Separator />

            <Section title="Your notes">
              {/* Keyed on the job, so moving to another one remounts the editor
                  with that job's notes rather than carrying a stale draft across. */}
              <JobNotesEditor key={job.id} jobId={job.id} notes={job.notes} />
            </Section>

            {data.otherRoles.length > 0 && (
              <>
                <Separator />
                <Section title={`Also open at ${job.company}`}>
                  {/* Five open roles on one team is a different signal from one,
                      and it is the kind of thing you only notice if the app
                      bothers to look. */}
                  <ul className="space-y-1.5">
                    {data.otherRoles.map((role) => (
                      <li key={role.id} className="flex items-center justify-between gap-3 text-xs">
                        <a
                          href={role.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate underline-offset-2 hover:underline"
                        >
                          {role.title}
                        </a>
                        <span className="shrink-0 text-muted-foreground">
                          {role.location ?? "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </>
            )}

            <Separator />

            <Section title="History">
              <JobTimeline events={data.events} />
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailFact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <span aria-hidden>{icon}</span>
        {label}
      </p>
      <p className="truncate text-xs capitalize">{children}</p>
    </div>
  );
}
