"use client";

import { useState } from "react";
import { BookmarkPlus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useGetSavedViews } from "@/hooks/saved-views/useGetSavedViews";
import { useCreateSavedView } from "@/hooks/saved-views/useCreateSavedView";
import { useUpdateSavedView } from "@/hooks/saved-views/useUpdateSavedView";
import { useDeleteSavedView } from "@/hooks/saved-views/useDeleteSavedView";
import type { SavedViewFilters } from "@/saved-views/saved-views.validators";

interface SavedViewsBarProps {
  activeViewId: string | null;
  /** Null restores the unfiltered list. */
  onSelect: (viewId: string | null, filters: SavedViewFilters) => void;
  /** What is on screen right now, which is what "save this view" saves. */
  currentFilters: SavedViewFilters;
  /** False when the list is unfiltered — a view of everything is the first tab. */
  isWorthSaving: boolean;
}

/**
 * Named filter sets, as tabs.
 *
 * "Remote, 70+, posted this week, not dismissed" is a question asked every
 * morning, and rebuilding it from four controls each time is the reason people
 * stop filtering at all and go back to scrolling.
 *
 * A view holds the filters and nothing else — not the bucket, not the scroll
 * position. Clicking one answers a question; it doesn't move you somewhere.
 */
export default function SavedViewsBar({
  activeViewId,
  onSelect,
  currentFilters,
  isWorthSaving,
}: SavedViewsBarProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const { data: views } = useGetSavedViews();
  const createView = useCreateSavedView();
  const updateView = useUpdateSavedView();
  const deleteView = useDeleteSavedView();

  const activeView = views?.find((view) => view.id === activeViewId) ?? null;


  function saveNewView() {
    const name = nameDraft.trim();
    if (name.length === 0) return;

    createView.mutate(
      { name, filters: currentFilters },
      {
        onSuccess: (view) => {
          setIsSaveDialogOpen(false);
          setNameDraft("");
          onSelect(view.id, view.filters);
        },
      },
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <Star className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />

        <button
          type="button"
          onClick={() => onSelect(null, {})}
          aria-pressed={activeViewId === null}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeViewId === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:bg-accent",
          )}
        >
          Everything
        </button>

        {views?.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelect(view.id, view.filters)}
            aria-pressed={view.id === activeViewId}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              view.id === activeViewId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            {view.name}
          </button>
        ))}

        {/* Only offered once there is something worth naming. A view saving an
            empty filter set is the "Everything" tab with extra steps. */}
        {isWorthSaving && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setIsSaveDialogOpen(true)}
          >
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
            Save view
          </Button>
        )}

        {activeView && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={updateView.isPending}
              onClick={() => updateView.mutate({ id: activeView.id, filters: currentFilters })}
            >
              {updateView.isPending && (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              )}
              Update “{activeView.name}”
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              disabled={deleteView.isPending}
              onClick={() =>
                deleteView.mutate(
                  { id: activeView.id },
                  // Back to the unfiltered list — leaving the deleted view's
                  // filters applied with no tab lit would be unexplainable.
                  { onSuccess: () => onSelect(null, {}) },
                )
              }
              aria-label={`Delete the view ${activeView.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </>
        )}
      </div>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
            <DialogDescription>
              The filters currently applied, under a name you can click tomorrow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="saved-view-name">Name</Label>
            <Input
              id="saved-view-name"
              value={nameDraft}
              autoFocus
              placeholder="Remote, 70+, this week"
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNewView();
              }}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button
              onClick={saveNewView}
              disabled={createView.isPending || nameDraft.trim().length === 0}
            >
              {createView.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
