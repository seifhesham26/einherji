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
    return <Skeleton className="h-32 rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Approval Queue</span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold">{drafts.length}</p>
          <p className="text-xs text-muted-foreground">
            message{drafts.length !== 1 ? "s" : ""} waiting for review
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => router.push("/messages")}>
          Review <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
