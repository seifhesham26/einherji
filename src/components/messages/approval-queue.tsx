"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Inbox } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import ApprovalCard from "./approval-card";
import { useGetMessages } from "@/hooks/messages/useGetMessages";
import { trpc } from "@/lib/trpc-client";

const SECONDS_PER_MESSAGE = 30;

export default function ApprovalQueue() {
  // Which drafts this sitting has already dealt with, by id.
  //
  // This was an index into the list, and the list is refetched after every
  // approval — so the approved draft disappeared from position N while the index
  // moved to N+1, and the draft that slid into N was never shown. Every approval
  // silently skipped the message behind it. Ids don't shift when the list does.
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const { data: messages = [], isLoading } = useGetMessages("draft");
  const { data: approvedToday = 0 } = trpc.messages.getApprovedTodayCount.useQuery();

  function markReviewed(messageId: string) {
    setReviewedIds((previous) => new Set(previous).add(messageId));
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const pending = messages.filter((item) => !reviewedIds.has(item.message.id));

  // Approving removes a draft from the server's list; skipping does not. So the
  // total for this sitting is what's still listed plus the ones that have since
  // left the list — counting every reviewed id on top would double the skips.
  const skippedButStillListed = messages.length - pending.length;
  const reviewedCount = reviewedIds.size;
  const totalInSitting = messages.length + (reviewedCount - skippedButStillListed);
  const progressValue = totalInSitting > 0 ? (reviewedCount / totalInSitting) * 100 : 100;
  const estimatedMinutes = Math.ceil((pending.length * SECONDS_PER_MESSAGE) / 60);

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-emerald-500/10 p-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <div>
          <p className="text-lg font-semibold">Queue&apos;s clear</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {approvedToday > 0
              ? `You approved ${approvedToday} message${approvedToday !== 1 ? "s" : ""} today. Approved drafts are waiting under "Ready to send".`
              : "Nothing to review. Find managers on the Jobs page to generate some drafts."}
          </p>
        </div>
      </div>
    );
  }

  const currentItem = pending[0];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="w-full max-w-2xl space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular-nums">
              {reviewedCount} of {totalInSitting} reviewed
            </span>
            {approvedToday > 0 && <span>· {approvedToday} approved today</span>}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />~{estimatedMinutes}m left
          </span>
        </div>
        <Progress
          value={progressValue}
          className="h-1.5"
          aria-label={`${reviewedCount} of ${totalInSitting} drafts reviewed`}
        />
      </div>

      {/* Keyed on the draft. Without it React keeps the previous card's component
          state, so the textarea still held the last message's text after moving
          on — and approving from there would have saved the wrong body. */}
      <ApprovalCard
        key={currentItem.message.id}
        item={currentItem}
        onNext={() => markReviewed(currentItem.message.id)}
      />
    </div>
  );
}
