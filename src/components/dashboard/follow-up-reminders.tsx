"use client";

import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { formatRelativeDate } from "@/utils/format-relative-date";

export default function FollowUpReminders() {
  const { data: overdue = [], isLoading } = trpc.leads.getOverdueFollowUps.useQuery();

  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${overdue.length > 0 ? "bg-red-500/10" : "bg-muted"}`}>
            <Bell className={`h-3.5 w-3.5 ${overdue.length > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </div>
          <span className="text-sm font-medium">Follow-up Reminders</span>
          {overdue.length > 0 && (
            <Badge variant="destructive" className="text-xs ml-auto">
              {overdue.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {overdue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue follow-ups. You're on top of it!</p>
        ) : (
          <ul className="space-y-2">
            {overdue.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {lead.firstName} {lead.lastName ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                </div>
                <span className="text-xs text-destructive shrink-0 whitespace-nowrap font-medium">
                  {formatRelativeDate(lead.nextActionAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
