"use client";

import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { formatRelativeDate } from "@/utils/format-relative-date";

const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  message_sent: "Message Sent",
  reply_received: "Reply Received",
  call_scheduled: "Call Scheduled",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  no_response: "No Response",
};

const STATUS_COLORS: Record<string, string> = {
  not_contacted: "bg-muted text-muted-foreground border-transparent",
  message_sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  reply_received: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  call_scheduled: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  interview: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  offer: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  no_response: "bg-muted text-muted-foreground border-transparent",
};

function getInitials(firstName: string, lastName?: string | null) {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function ActivityFeed() {
  const { data: recentLeads = [], isLoading } = trpc.leads.getRecentActivity.useQuery();

  if (isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-muted p-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">Recent Activity</span>
        </div>
      </CardHeader>
      <CardContent>
        {recentLeads.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Run a scrape to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentLeads.map((lead) => {
              const status = lead.status ?? "not_contacted";
              return (
                <li key={lead.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(lead.firstName, lead.lastName)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.firstName} {lead.lastName ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(lead.updatedAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
