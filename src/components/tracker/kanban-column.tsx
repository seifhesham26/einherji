"use client";

import { Droppable } from "@hello-pangea/dnd";
import LeadKanbanCard from "./lead-kanban-card";
import { getLeadStatusDisplay } from "@/components/leads/lead-status-display";
import type { Lead } from "@/types/lead";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  leads: Lead[];
}

export default function KanbanColumn({ columnId, title, leads }: KanbanColumnProps) {
  const status = getLeadStatusDisplay(columnId);

  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px]">
      {/* Sticky, because the board scrolls vertically inside a page that also
          scrolls — past the first few cards you could no longer tell which
          column you were looking at. */}
      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-md bg-background/95 px-1 py-1 backdrop-blur">
        <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} aria-hidden />
        <h2 className={`text-sm font-medium truncate flex-1 ${status.heading}`}>{title}</h2>
        <span className="text-xs text-muted-foreground font-medium tabular-nums ml-auto shrink-0 bg-muted rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 rounded-xl p-2 min-h-[140px] transition-colors ${
              snapshot.isDraggingOver ? "bg-accent/60 ring-1 ring-border" : "bg-muted/20"
            }`}
          >
            {leads.map((lead, index) => (
              <LeadKanbanCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}

            {/* An empty column was a blank grey rectangle with no hint that it
                was a drop target. */}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                Drop a contact here
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
