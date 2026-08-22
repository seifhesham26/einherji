"use client";

import { Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface JobsSelectionBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAll: (isSelected: boolean) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  isDeleting: boolean;
}

/**
 * The bar that appears once anything is selected.
 *
 * Sticky rather than inline: with a three-column grid the selection you made at
 * the bottom of the page would otherwise have its actions scrolled off the top.
 */
export default function JobsSelectionBar({
  selectedCount,
  visibleCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  isDeleting,
}: JobsSelectionBarProps) {
  const isAllSelected = visibleCount > 0 && selectedCount === visibleCount;

  return (
    <div
      className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl bg-card/95 p-3 ring-1 ring-foreground/10 shadow-sm supports-backdrop-filter:backdrop-blur-sm"
      role="region"
      aria-label="Selected jobs"
    >
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <Checkbox
          checked={isAllSelected}
          // The tri-state matters: a plain unchecked box next to "3 selected"
          // reads as a bug.
          indeterminate={selectedCount > 0 && !isAllSelected}
          onCheckedChange={(checked) => onSelectAll(checked === true)}
          aria-label={isAllSelected ? "Deselect all jobs" : "Select all visible jobs"}
        />
        <span aria-live="polite">
          {selectedCount} selected
          <span className="text-muted-foreground font-normal"> of {visibleCount}</span>
        </span>
      </label>

      <div className="flex items-center gap-2 ml-auto">
        <Button size="sm" variant="ghost" onClick={onClearSelection} disabled={isDeleting}>
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear selection
        </Button>
        <Button size="sm" variant="destructive" onClick={onDeleteSelected} disabled={isDeleting}>
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
          Delete {selectedCount}
        </Button>
      </div>
    </div>
  );
}
