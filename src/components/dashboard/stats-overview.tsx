"use client";

import { Briefcase, Users, CheckCircle2, MessageSquare, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc-client";
import { useGetLeads } from "@/hooks/leads/useGetLeads";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
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
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  const replies = leads.filter((l) => l.status === "reply_received").length;
  const calls = leads.filter((l) => l.status === "call_scheduled").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        icon={<Briefcase className="h-5 w-5" />}
        label="Jobs scraped today"
        value={jobStats?.scrapedToday ?? 0}
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Managers found"
        value={jobStats?.managersFound ?? 0}
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5" />}
        label="Approved today"
        value={approvedToday ?? 0}
      />
      <StatCard
        icon={<MessageSquare className="h-5 w-5" />}
        label="Replies received"
        value={replies}
      />
      <StatCard
        icon={<Phone className="h-5 w-5" />}
        label="Calls scheduled"
        value={calls}
      />
    </div>
  );
}
