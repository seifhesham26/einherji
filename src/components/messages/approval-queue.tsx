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
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: messages = [], isLoading } = useGetMessages("draft");
  const { data: approvedToday = 0 } = trpc.messages.getApprovedTodayCount.useQuery();

  function handleNext() {
    setCurrentIndex((prev) => prev + 1);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-2xl mx-auto">
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Messages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review and approve AI-generated outreach.</p>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const remaining = messages.length - currentIndex;
  const totalSeen = currentIndex;
  const totalInQueue = messages.length;
  const progressValue = totalInQueue > 0 ? (totalSeen / totalInQueue) * 100 : 100;
  const estimatedSeconds = remaining * SECONDS_PER_MESSAGE;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  if (remaining <= 0 || totalInQueue === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Messages</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Review and approve AI-generated outreach.</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="rounded-full bg-emerald-500/10 p-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-semibold">Queue's clear!</p>
            <p className="text-sm text-muted-foreground mt-1">
              {approvedToday > 0
                ? `You approved ${approvedToday} message${approvedToday !== 1 ? "s" : ""} today.`
                : "No messages in the queue right now. Find managers on the Jobs page to generate some."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = messages[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Header + progress */}
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Messages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review and approve AI-generated outreach.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-sm text-muted-foreground">
            <Inbox className="h-4 w-4" />
            <span className="tabular-nums">{remaining} left</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {totalSeen} of {totalInQueue} reviewed
              {approvedToday > 0 && ` · ${approvedToday} approved today`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              ~{estimatedMinutes}m left
            </span>
          </div>
          <Progress value={progressValue} className="h-1.5" />
        </div>
      </div>

      {/* Current card */}
      <ApprovalCard item={currentItem} onNext={handleNext} />
    </div>
  );
}
