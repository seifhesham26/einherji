"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { getLeadStatusDisplay } from "@/components/leads/lead-status-display";
import { formatRelativeDate } from "@/utils/format-relative-date";

function getInitials(firstName: string, lastName?: string | null) {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function ActivityFeed() {
  const { data: recentLeads, isLoading } = trpc.leads.getRecentActivity.useQuery();

  return (
    <Card className="rounded-xl">
      {/* The header renders during loading too. Replacing the whole card with a
          bare rectangle threw away the one bit of context — what this card is —
          and made the column jump when it arrived. */}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-muted p-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">Recent activity</span>
          <Link
            href="/leads"
            className="ml-auto inline-flex items-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            All leads
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="flex items-center gap-2.5 py-2.5 first:pt-0">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-24 rounded-full" />
              </li>
            ))}
          </ul>
        ) : !recentLeads || recentLeads.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Run a scrape to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recentLeads.map((lead) => {
              const status = getLeadStatusDisplay(lead.status);

              return (
                <li
                  key={lead.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
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
                    <Badge variant="outline" className={`text-xs ${status.badge}`}>
                      {status.label}
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
