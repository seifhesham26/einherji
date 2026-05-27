"use client";

import { Briefcase, Users, CheckCircle2, MessageSquare, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { useGetLeads } from "@/hooks/leads/useGetLeads";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  colorClass: string;
}

function StatCard({ icon, label, value, colorClass }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className={cn("inline-flex rounded-lg p-2", colorClass)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function StatsOverview() {
  const { data: jobStats, isLoading: jobsLoading } = trpc.jobs.getStats.useQuery();
  const { data: approvedToday, isLoading: approvedLoading } = trpc.messages.getApprovedTodayCount.useQuery();
  const { data: leads = [], isLoading: leadsLoading } = useGetLeads();

  const isLoading = jobsLoading || approvedLoading || leadsLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-xl" />
        ))}
      </div>
    );
  }

  const replies = leads.filter((l) => l.status === "reply_received").length;
  const calls = leads.filter((l) => l.status === "call_scheduled").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        icon={<Briefcase className="h-4 w-4 text-blue-500" />}
        label="Jobs scraped today"
        value={jobStats?.scrapedToday ?? 0}
        colorClass="bg-blue-500/10"
      />
      <StatCard
        icon={<Users className="h-4 w-4 text-emerald-500" />}
        label="Managers found"
        value={jobStats?.managersFound ?? 0}
        colorClass="bg-emerald-500/10"
      />
      <StatCard
        icon={<CheckCircle2 className="h-4 w-4 text-violet-500" />}
        label="Approved today"
        value={approvedToday ?? 0}
        colorClass="bg-violet-500/10"
      />
      <StatCard
        icon={<MessageSquare className="h-4 w-4 text-amber-500" />}
        label="Replies received"
        value={replies}
        colorClass="bg-amber-500/10"
      />
      <StatCard
        icon={<Phone className="h-4 w-4 text-orange-500" />}
        label="Calls scheduled"
        value={calls}
        colorClass="bg-orange-500/10"
      />
    </div>
  );
}
