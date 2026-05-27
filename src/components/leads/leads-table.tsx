"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, MessageSquarePlus, Search, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLeads } from "@/hooks/leads/useGetLeads";
import { useGenerateMessage } from "@/hooks/messages/useGenerateMessage";
import { formatRelativeDate } from "@/utils/format-relative-date";
import type { LeadStatus } from "@/leads/leads.validators";

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
  offer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  no_response: "bg-muted text-muted-foreground border-transparent",
};

function LeadAvatar({ firstName, lastName }: { firstName: string; lastName?: string | null }) {
  const initials = `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">{initials}</span>
    </div>
  );
}

export default function LeadsTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const { data: leads = [], isLoading } = useGetLeads();
  const generateMessage = useGenerateMessage();

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      !search ||
      `${lead.firstName} ${lead.lastName ?? ""}`.toLowerCase().includes(search.toLowerCase()) ||
      lead.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleGenerateMessage(leadId: string) {
    await generateMessage.mutateAsync({ leadId, template: "hiring_manager" });
    router.push("/messages");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Hiring managers found for your target jobs.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or company…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground -mt-2">
        {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No leads yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Go to Jobs and click "Find Manager" to discover hiring contacts.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <LeadAvatar firstName={lead.firstName} lastName={lead.lastName} />
                      <span className="font-medium text-sm">
                        {lead.firstName} {lead.lastName ?? ""}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                    {lead.title ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{lead.company}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${STATUS_COLORS[lead.status ?? "not_contacted"]}`}
                    >
                      {STATUS_LABELS[lead.status ?? "not_contacted"]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeDate(lead.lastContactedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateMessage(lead.id)}
                        disabled={generateMessage.isPending && generateMessage.variables?.leadId === lead.id}
                        title="Generate message"
                      >
                        {generateMessage.isPending && generateMessage.variables?.leadId === lead.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {lead.linkedinUrl && (
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ size: "sm", variant: "ghost" })}
                          title="View on LinkedIn"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
