"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { formatRelativeDate } from "@/utils/format-relative-date";

// Past this the card stops being a reminder and becomes a second leads table.
const MAX_SHOWN = 5;

export default function FollowUpReminders() {
  const { data: overdue, isLoading } = trpc.leads.getOverdueFollowUps.useQuery();

  const overdueCount = overdue?.length ?? 0;
  const hasOverdue = overdueCount > 0;

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-1.5 ${hasOverdue ? "bg-red-500/10" : "bg-muted"}`}>
            <Bell
              className={`h-3.5 w-3.5 ${hasOverdue ? "text-red-500" : "text-muted-foreground"}`}
            />
          </div>
          <span className="text-sm font-medium">Follow-up reminders</span>
          {hasOverdue && (
            <Badge variant="destructive" className="text-xs ml-auto">
              {overdueCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : !overdue || !hasOverdue ? (
          <p className="text-sm text-muted-foreground">
            No overdue follow-ups. You&apos;re on top of it.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {overdue.slice(0, MAX_SHOWN).map((lead) => (
                <li key={lead.id}>
                  <Link
                    href="/tracker"
                    className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.firstName} {lead.lastName ?? ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                    </div>
                    <span className="text-xs text-destructive shrink-0 whitespace-nowrap font-medium">
                      {formatRelativeDate(lead.nextActionAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {overdueCount > MAX_SHOWN && (
              <Link
                href="/tracker"
                className="mt-2 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {overdueCount - MAX_SHOWN} more overdue
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
