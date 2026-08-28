"use client";

import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { formatRelativeDate } from "@/utils/format-relative-date";
import { getJobStatusDisplay } from "./job-status-display";
import type { JobEvent } from "@/types/job";

/**
 * What happened to this job, newest first.
 *
 * A status column tells you where something is and nothing about how it got
 * there. "Applied 3 weeks ago, screening 2 weeks ago, nothing since" is the
 * whole answer to the question you actually have about an old application.
 */
export default function JobTimeline({ events }: { events: JobEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Nothing yet. Moving this job along the pipeline will start its history.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-2.5 text-xs">
          <span className="mt-0.5 text-muted-foreground" aria-hidden>
            {event.kind === "note" ? (
              <MessageSquare className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {event.kind === "status_change" ? (
              <p className="flex items-center gap-1.5 flex-wrap">
                {/* A transition with no from-status is a job created straight
                    into a status — rendering an empty label either side of the
                    arrow would read as a bug. */}
                {event.fromStatus && (
                  <>
                    <span className="text-muted-foreground">
                      {getJobStatusDisplay(event.fromStatus).label}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
                  </>
                )}
                <span className="font-medium">{getJobStatusDisplay(event.toStatus).label}</span>
              </p>
            ) : (
              <p className="font-medium">Note</p>
            )}

            {event.body && (
              <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{event.body}</p>
            )}

            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              {formatRelativeDate(event.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
