"use client";

import { Label } from "@/components/ui/label";
import { useGetBuckets } from "@/hooks/buckets/useGetBuckets";

interface BucketSelectProps {
  value: string;
  onChange: (bucketId: string) => void;
  id?: string;
  label?: string;
  hint?: string;
}

/**
 * Picks which hunt a new contact belongs to.
 *
 * Renders nothing when the account has no buckets — a lone "No bucket" dropdown
 * is a question the user can't yet answer, and it appears on three dialogs.
 */
export default function BucketSelect({
  value,
  onChange,
  id = "bucketSelect",
  label = "Add to bucket",
  hint = "Keeps these separate from your other contacts.",
}: BucketSelectProps) {
  const { data: buckets = [] } = useGetBuckets();

  if (buckets.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">No bucket</option>
        {buckets.map((bucket) => (
          <option key={bucket.id} value={bucket.id}>
            {bucket.name}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
