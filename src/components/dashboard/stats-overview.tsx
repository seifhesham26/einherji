"use client";

import Link from "next/link";
import { Briefcase, Users, CheckCircle2, MessageSquare, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { useGetLeads } from "@/hooks/leads/useGetLeads";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  colorClass: string;
  /** Where this number lives in full. */
  href: string;
}

/**
 * One number, and the way to the thing it counts.
 *
 * Each card owns its own loading state. They were gated on one combined
 * `isLoading`, so the slowest of three queries blanked the whole row — and the
 * leads query is the slowest, because it pulls every lead.
 *
 * They're links because every one of these numbers is a question ("which
 * replies?") whose answer is one page away, and there was no way to get there.
 */
function StatCard({ icon, label, value, colorClass, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 space-y-3 transition-colors hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className={cn("inline-flex rounded-lg p-2", colorClass)}>{icon}</div>
      <div>
        {value === undefined ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </Link>
  );
}

export default function StatsOverview() {
  const { data: jobStats } = trpc.jobs.getStats.useQuery();
  const { data: approvedToday } = trpc.messages.getApprovedTodayCount.useQuery();
  const { data: leads } = useGetLeads();

  // Counted from leads, not from processed jobs — one job can yield zero or many
  // managers, so the old job-based count was reporting the wrong number.
  const replies = leads?.filter((lead) => lead.status === "reply_received").length;
  const calls = leads?.filter((lead) => lead.status === "call_scheduled").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        icon={<Briefcase className="h-4 w-4 text-blue-500" />}
        label="Jobs scraped today"
        value={jobStats?.scrapedToday}
        colorClass="bg-blue-500/10"
        href="/jobs"
      />
      <StatCard
        icon={<Users className="h-4 w-4 text-emerald-500" />}
        label="Managers found"
        value={leads?.length}
        colorClass="bg-emerald-500/10"
        href="/leads"
      />
      <StatCard
        icon={<CheckCircle2 className="h-4 w-4 text-violet-500" />}
        label="Approved today"
        value={approvedToday}
        colorClass="bg-violet-500/10"
        href="/messages"
      />
      <StatCard
        icon={<MessageSquare className="h-4 w-4 text-amber-500" />}
        label="Replies received"
        value={replies}
        colorClass="bg-amber-500/10"
        href="/leads?status=reply_received"
      />
      <StatCard
        icon={<Phone className="h-4 w-4 text-orange-500" />}
        label="Calls scheduled"
        value={calls}
        colorClass="bg-orange-500/10"
        href="/leads?status=call_scheduled"
      />
    </div>
  );
}
