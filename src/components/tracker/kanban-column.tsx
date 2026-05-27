"use client";

import { Droppable } from "@hello-pangea/dnd";
import LeadKanbanCard from "./lead-kanban-card";
import type { Lead } from "@/types/lead";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  leads: Lead[];
  accentColor?: string;
}

const COLUMN_ACCENTS: Record<string, { dot: string; header: string }> = {
  not_contacted: { dot: "bg-muted-foreground", header: "" },
  message_sent: { dot: "bg-blue-500", header: "text-blue-500" },
  reply_received: { dot: "bg-yellow-500", header: "text-yellow-600 dark:text-yellow-400" },
  call_scheduled: { dot: "bg-orange-500", header: "text-orange-500" },
  interview: { dot: "bg-violet-500", header: "text-violet-500" },
  offer: { dot: "bg-emerald-500", header: "text-emerald-500" },
  rejected: { dot: "bg-red-500", header: "text-red-500" },
  no_response: { dot: "bg-muted-foreground/50", header: "text-muted-foreground" },
};

export default function KanbanColumn({ columnId, title, leads }: KanbanColumnProps) {
  const accent = COLUMN_ACCENTS[columnId] ?? { dot: "bg-muted-foreground", header: "" };

  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px]">
      <div className="flex items-center gap-2 px-1 py-0.5">
        <span className={`h-2 w-2 rounded-full shrink-0 ${accent.dot}`} />
        <span className={`text-sm font-medium truncate flex-1 ${accent.header}`}>{title}</span>
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
              snapshot.isDraggingOver
                ? "bg-accent/60 ring-1 ring-border"
                : "bg-muted/20"
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
