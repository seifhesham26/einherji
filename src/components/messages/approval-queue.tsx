"use client";

import { useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
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
      <div className="space-y-4 w-full max-w-2xl mx-auto">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
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
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-xl font-semibold">All done!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {approvedToday > 0
              ? `You approved ${approvedToday} message${approvedToday !== 1 ? "s" : ""} today.`
              : "No messages in the queue right now."}
          </p>
        </div>
      </div>
    );
  }

  const currentItem = messages[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Progress header */}
      <div className="w-full max-w-2xl space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalSeen} of {totalInQueue} reviewed
            {approvedToday > 0 && ` · ${approvedToday} approved today`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{estimatedMinutes} min left
          </span>
        </div>
        <Progress value={progressValue} className="h-1.5" />
      </div>

      {/* Current card */}
      <ApprovalCard item={currentItem} onNext={handleNext} />
    </div>
  );
}
