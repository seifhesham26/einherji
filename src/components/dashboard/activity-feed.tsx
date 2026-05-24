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
  not_contacted: "text-muted-foreground",
  message_sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  reply_received: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  call_scheduled: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  interview: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  offer: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  no_response: "bg-muted text-muted-foreground",
};

export default function ActivityFeed() {
  const { data: recentLeads = [], isLoading } = trpc.leads.getRecentActivity.useQuery();

  if (isLoading) {
    return <Skeleton className="h-64 rounded-lg" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Activity</span>
        </div>
      </CardHeader>
      <CardContent>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {recentLeads.map((lead) => {
              const status = lead.status ?? "not_contacted";
              return (
                <li key={lead.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {lead.firstName} {lead.lastName ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[status]}`}
                    >
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
