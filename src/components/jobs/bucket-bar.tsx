"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetBuckets } from "@/hooks/buckets/useGetBuckets";
import { useCreateBucket } from "@/hooks/buckets/useCreateBucket";
import { useDeleteBucket } from "@/hooks/buckets/useDeleteBucket";
import {
  BUCKET_KIND_PRESETS,
  bucketKindValues,
  type BucketKind,
} from "@/buckets/buckets.validators";

interface BucketBarProps {
  selectedBucketId: string | null;
  onSelect: (bucketId: string | null) => void;
}

/**
 * Switches between separate hunts.
 *
 * One account runs several unrelated searches — a job hunt, client prospecting,
 * a supplier list — and they can't share a keyword set. Each bucket owns its own
 * keywords, places and sources, and only shows what it found.
 */
export default function BucketBar({ selectedBucketId, onSelect }: BucketBarProps) {
  const { data: buckets = [], isLoading } = useGetBuckets();
  const deleteBucket = useDeleteBucket();
  const [isCreating, setIsCreating] = useState(false);

  if (isLoading) return <div className="h-9 w-full rounded-md bg-muted/40 animate-pulse" />;

  const selected = buckets.find((bucket) => bucket.id === selectedBucketId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={selectedBucketId === null ? "default" : "outline"}
          onClick={() => onSelect(null)}
        >
          All
        </Button>

        {buckets.map((bucket) => (
          <Button
            key={bucket.id}
            size="sm"
            variant={bucket.id === selectedBucketId ? "default" : "outline"}
            onClick={() => onSelect(bucket.id)}
            className="gap-2"
          >
            {bucket.name}
            {bucket.keywords.length === 0 && (
              <Badge variant="secondary" className="text-[10px]">
                no keywords
              </Badge>
            )}
          </Button>
        ))}

        <Button size="sm" variant="ghost" className="gap-2" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" />
          New bucket
        </Button>
      </div>

      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {BUCKET_KIND_PRESETS[selected.kind as BucketKind].label}
            </span>
            {selected.keywords.length > 0 && <> · {selected.keywords.join(", ")}</>}
            {selected.locations.length > 0 && <> · {selected.locations.join(", ")}</>}
            {BUCKET_KIND_PRESETS[selected.kind as BucketKind].note && (
              <p className="mt-1 text-amber-600 dark:text-amber-400">
                {BUCKET_KIND_PRESETS[selected.kind as BucketKind].note}
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="gap-2 shrink-0"
            disabled={deleteBucket.isPending}
            onClick={() => {
              onSelect(null);
              deleteBucket.mutate({ id: selected.id });
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}

      <CreateBucketDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={onSelect}
      />
    </div>
  );
}

function CreateBucketDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (bucketId: string) => void;
}) {
  const createBucket = useCreateBucket();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<BucketKind>("jobs");
  const [keywords, setKeywords] = useState("");
  const [locations, setLocations] = useState("");
  const [pitch, setPitch] = useState("");

  const preset = BUCKET_KIND_PRESETS[kind];

  function splitList(value: string): string[] {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  async function handleCreate() {
    const bucket = await createBucket
      .mutateAsync({
        name,
        kind,
        keywords: splitList(keywords),
        locations: splitList(locations),
        // The preset's sources are a starting point, changeable per bucket later.
        sources: preset.sources as never,
        pitch: pitch || undefined,
      })
      .catch(() => null);

    if (!bucket) return;
    onCreated(bucket.id);
    setName("");
    setKeywords("");
    setLocations("");
    setPitch("");
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New bucket</DialogTitle>
          <DialogDescription>
            A separate hunt with its own keywords, places and sources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bucketName">Name</Label>
            <Input
              id="bucketName"
              placeholder="Dad's paper factory"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>What is it for?</Label>
            <div className="grid gap-2">
              {bucketKindValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    kind === value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="text-sm font-medium">{BUCKET_KIND_PRESETS[value].label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {BUCKET_KIND_PRESETS[value].description}
                  </p>
                  {BUCKET_KIND_PRESETS[value].note && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {BUCKET_KIND_PRESETS[value].note}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucketKeywords">Keywords</Label>
            <Input
              id="bucketKeywords"
              placeholder="react developer, next.js"
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma separated. Arabic works — searches are matched in both scripts.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucketLocations">Locations</Label>
            <Input
              id="bucketLocations"
              placeholder="Remote, Cairo"
              value={locations}
              onChange={(event) => setLocations(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucketPitch">What you&apos;re offering</Label>
            <Textarea
              id="bucketPitch"
              rows={3}
              className="resize-none"
              placeholder="Imported 80gsm engineering drawing rolls, delivered across Egypt."
              value={pitch}
              onChange={(event) => setPitch(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used as the sender background when generating messages for this bucket.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={createBucket.isPending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name || createBucket.isPending} className="gap-2">
            {createBucket.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create bucket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
