"use client";

import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import LeadKanbanCard from "./lead-kanban-card";
import type { Lead } from "@/types/lead";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  leads: Lead[];
}

export default function KanbanColumn({ columnId, title, leads }: KanbanColumnProps) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-medium truncate">{title}</span>
        <Badge variant="secondary" className="text-xs ml-auto shrink-0">
          {leads.length}
        </Badge>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 rounded-lg p-2 min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? "bg-muted/60" : "bg-muted/20"
            }`}
          >
            {leads.map((lead, index) => (
              <LeadKanbanCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
