"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { Skeleton } from "@/components/ui/skeleton";
import KanbanColumn from "./kanban-column";
import { useGetLeads } from "@/hooks/leads/useGetLeads";
import { useUpdateLead } from "@/hooks/leads/useUpdateLead";
import type { LeadStatus } from "@/leads/leads.validators";

const COLUMNS: { id: LeadStatus; title: string }[] = [
  { id: "not_contacted", title: "Not Contacted" },
  { id: "message_sent", title: "Message Sent" },
  { id: "reply_received", title: "Reply Received" },
  { id: "call_scheduled", title: "Call Scheduled" },
  { id: "interview", title: "Interview" },
  { id: "offer", title: "Offer" },
  { id: "rejected", title: "Rejected" },
  { id: "no_response", title: "No Response" },
];

export default function KanbanBoard() {
  const { data: leads = [], isLoading } = useGetLeads();
  const updateLead = useUpdateLead();

  function handleDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as LeadStatus;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.status === newStatus) return;

    updateLead.mutate({ id: draggableId, status: newStatus });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold">Tracker</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Drag leads across columns to update their status.
        </p>
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex flex-col gap-2 min-w-[220px]">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                columnId={column.id}
                title={column.title}
                leads={leads.filter((lead) => (lead.status ?? "not_contacted") === column.id)}
              />
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
