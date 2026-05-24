"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, MessageSquarePlus, Search } from "lucide-react";
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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_contacted: "secondary",
  message_sent: "default",
  reply_received: "default",
  call_scheduled: "default",
  interview: "default",
  offer: "default",
  rejected: "destructive",
  no_response: "outline",
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
          <SelectTrigger className="w-full sm:w-48">
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

      <p className="text-sm text-muted-foreground">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <p className="text-sm">No leads yet. Find managers on the Jobs page to get started.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Contacted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.firstName} {lead.lastName ?? ""}
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleGenerateMessage(lead.id)}
                        disabled={generateMessage.isPending && generateMessage.variables?.leadId === lead.id}
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
