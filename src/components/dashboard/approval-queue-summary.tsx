"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMessages } from "@/hooks/messages/useGetMessages";

export default function ApprovalQueueSummary() {
  const router = useRouter();
  const { data: drafts = [], isLoading } = useGetMessages("draft");

  if (isLoading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  const hasDrafts = drafts.length > 0;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-sky-500/15 border border-sky-200/60 dark:border-sky-800/60 p-1.5 shadow-2xs">
            <Inbox className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Approval Queue</span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className={`console-mono text-3xl font-bold tabular-nums ${hasDrafts ? "text-sky-600 dark:text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.25)]" : ""}`}>
            {drafts.length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            message{drafts.length !== 1 ? "s" : ""} waiting for review
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 font-medium"
          onClick={() => router.push("/messages")}
        >
          Review <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
