"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Skeleton } from "@/components/ui/skeleton";
import BucketBar from "@/components/buckets/bucket-bar";
import KanbanColumn from "./kanban-column";
import { useBucketFilter } from "@/hooks/buckets/useBucketFilter";
import { useGetLeads } from "@/hooks/leads/useGetLeads";
import { useUpdateLead } from "@/hooks/leads/useUpdateLead";
import {
  LEAD_STATUS_DISPLAY,
  LEAD_STATUS_ORDER,
} from "@/components/leads/lead-status-display";
import type { LeadStatus } from "@/leads/leads.validators";

export default function KanbanBoard() {
  const { bucketId, selectBucket } = useBucketFilter();

  const { data: leads = [], isLoading } = useGetLeads({ bucketId: bucketId ?? undefined });
  const updateLead = useUpdateLead();

  function handleDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as LeadStatus;
    const lead = leads.find((candidate) => candidate.id === draggableId);
    if (!lead || lead.status === newStatus) return;

    updateLead.mutate({ id: draggableId, status: newStatus });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tracker</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drag a contact between columns to change their status.
          {bucketId ? " Showing one bucket." : ""}
        </p>
      </div>

      <BucketBar selectedBucketId={bucketId} onSelect={selectBucket} countBy="leads" />

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STATUS_ORDER.map((status) => (
            <div key={status} className="flex flex-col gap-2 min-w-[220px]">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">
            {bucketId ? "Nothing in this bucket yet" : "No contacts to track"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contacts appear here as soon as you add them on the Leads page.
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* scrollbar-thin keeps the eight-column board scrollable without the
              default bar reading as a divider under the last row of cards. */}
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
            {LEAD_STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                columnId={status}
                title={LEAD_STATUS_DISPLAY[status].label}
                leads={leads.filter((lead) => (lead.status ?? "not_contacted") === status)}
              />
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
