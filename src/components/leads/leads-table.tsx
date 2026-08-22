"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ExternalLink, MessageSquarePlus, Search, SearchX, Users, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLeads } from "@/hooks/leads/useGetLeads";
import { useBucketFilter } from "@/hooks/buckets/useBucketFilter";
import { useQueryFilter } from "@/hooks/useQueryFilter";
import BucketBar from "@/components/buckets/bucket-bar";
import AddLeadDialog from "./add-lead-dialog";
import FindBusinessesDialog from "./find-businesses-dialog";
import ImportLeadsDialog from "./import-leads-dialog";
import { LEAD_STATUS_DISPLAY, LEAD_STATUS_ORDER, getLeadStatusDisplay } from "./lead-status-display";
import { useGenerateMessage } from "@/hooks/messages/useGenerateMessage";
import { formatRelativeDate } from "@/utils/format-relative-date";

function LeadAvatar({ firstName, lastName }: { firstName: string; lastName?: string | null }) {
  const initials = `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary" aria-hidden>
        {initials}
      </span>
    </div>
  );
}

export default function LeadsTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { bucketId, selectBucket } = useBucketFilter();
  // In the URL so the dashboard's "Replies received" card can link straight to
  // the filtered list, and so a filtered view survives a reload.
  const [statusFilter, setStatusFilter] = useQueryFilter("status");

  const { data: leads = [], isLoading } = useGetLeads({ bucketId: bucketId ?? undefined });
  const generateMessage = useGenerateMessage();

  const normalizedSearch = search.trim().toLowerCase();
  const activeStatus = statusFilter ?? "all";

  const filtered = leads.filter((lead) => {
    const matchesSearch =
      !normalizedSearch ||
      `${lead.firstName} ${lead.lastName ?? ""}`.toLowerCase().includes(normalizedSearch) ||
      lead.company.toLowerCase().includes(normalizedSearch);
    const matchesStatus = activeStatus === "all" || lead.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = Boolean(normalizedSearch) || activeStatus !== "all";
  const isFilteredEmpty = leads.length > 0 && filtered.length === 0;

  function clearFilters() {
    setSearch("");
    setStatusFilter(null);
  }

  async function handleGenerateMessage(leadId: string) {
    // No template named on purpose — the server picks one from the lead's bucket,
    // so a supplier gets a purchasing enquiry rather than a job application.
    // The hook toasts on failure; catching here stops a rejected mutation
    // becoming an unhandled rejection and navigating anyway.
    try {
      await generateMessage.mutateAsync({ leadId });
      router.push("/messages");
    } catch {
      // Already surfaced by the mutation's own error handler.
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bucketId
              ? "Contacts filed under this bucket."
              : "Everyone you're reaching out to, across every bucket."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ImportLeadsDialog defaultBucketId={bucketId} />
          <FindBusinessesDialog bucketId={bucketId} />
          <AddLeadDialog defaultBucketId={bucketId} />
        </div>
      </div>

      <BucketBar selectedBucketId={bucketId} onSelect={selectBucket} countBy="leads" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search leads by name or company"
            placeholder="Search by name or company…"
            className="pl-9 pr-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select
          value={activeStatus}
          onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {LEAD_STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {LEAD_STATUS_DISPLAY[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground -mt-2" aria-live="polite">
        {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        {hasActiveFilters && ` of ${leads.length}`}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : isFilteredEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <SearchX className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No leads match these filters</p>
            <p className="text-xs text-muted-foreground mt-1">
              {leads.length} contact{leads.length === 1 ? " is" : "s are"} hidden by your search
              or status filter.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">
                {bucketId ? "Nothing in this bucket yet" : "No leads yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {bucketId
                  ? "Add contacts with Find businesses or Import list, and they'll be filed here."
                  : "Add the hiring manager or contact for a role you want, then generate a message to them."}
              </p>
            </div>
            <div className="flex justify-center">
              <AddLeadDialog defaultBucketId={bucketId} />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last contact</TableHead>
                <TableHead className="text-right w-[96px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => {
                const status = getLeadStatusDisplay(lead.status);
                const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
                const isGenerating =
                  generateMessage.isPending && generateMessage.variables?.leadId === lead.id;

                return (
                  <TableRow key={lead.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <LeadAvatar firstName={lead.firstName} lastName={lead.lastName} />
                        <span className="font-medium text-sm">{leadName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                      {lead.title ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{lead.company}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${status.badge}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeDate(lead.lastContactedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Was opacity-0 until hover, which meant these controls did
                          not exist on a touch screen and could be tabbed to while
                          invisible. Dimmed and always present instead: full
                          strength on hover, on keyboard focus, or on any device
                          that can't hover at all. */}
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleGenerateMessage(lead.id)}
                          disabled={isGenerating}
                          aria-label={`Generate a message to ${leadName}`}
                          title="Generate message"
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </Button>
                        {lead.linkedinUrl && (
                          <a
                            href={lead.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
                            aria-label={`Open ${leadName}'s LinkedIn profile in a new tab`}
                            title="View on LinkedIn"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
