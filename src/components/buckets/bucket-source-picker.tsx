"use client";

import { Check, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetCredentialStatuses } from "@/hooks/credentials/useGetCredentialStatuses";
import { SOURCE_DEFINITIONS, type SourceTier } from "@/lib/scrapers/source-registry";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";

// Places isn't a feed of listings — it's searched live from Leads → Find
// businesses, so offering it as a scrape source here would promise a run that
// can't happen.
const PICKABLE_TIERS: { tier: SourceTier; title: string }[] = [
  { tier: "company_board", title: "Company job boards" },
  { tier: "aggregator", title: "Aggregators" },
  { tier: "marketplace", title: "Freelance & contract" },
  { tier: "scraped", title: "Scraped" },
];

// Retained so historical rows stay readable, but there's nothing to schedule
// against it — hiring-manager lookup isn't a scrape.
const HIDDEN_SOURCES: JobSourceName[] = ["apify"];

interface BucketSourcePickerProps {
  value: JobSourceName[];
  onChange: (sources: JobSourceName[]) => void;
}

/**
 * Which sources this bucket scrapes.
 *
 * Per-bucket rather than per-account: a client hunt wants Freelancer and the HN
 * freelance thread, a job hunt wants ATS boards, and running each bucket against
 * the union of both is what buries one in the other's results.
 */
export default function BucketSourcePicker({ value, onChange }: BucketSourcePickerProps) {
  const { data: credentialStatuses = [] } = useGetCredentialStatuses();

  const configuredSources = new Set(
    credentialStatuses.filter((status) => status.isConfigured).map((status) => status.source),
  );

  function toggle(sourceId: JobSourceName) {
    onChange(
      value.includes(sourceId)
        ? value.filter((id) => id !== sourceId)
        : [...value, sourceId],
    );
  }

  return (
    <div className="space-y-3">
      {PICKABLE_TIERS.map(({ tier, title }) => {
        const sources = SOURCE_DEFINITIONS.filter(
          (source) => source.tier === tier && !HIDDEN_SOURCES.includes(source.id),
        );
        if (sources.length === 0) return null;

        return (
          <div key={tier} className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((source) => {
                const isSelected = value.includes(source.id);
                const needsKey = source.credentialFields.length > 0;
                const isMissingKey = needsKey && !configuredSources.has(source.id);

                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => toggle(source.id)}
                    title={source.description}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                    {source.name}
                    {/* A selected source with no key is skipped silently at run
                        time, so it has to look different from a working one. */}
                    {isSelected && isMissingKey && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/50 px-1 py-0 text-[9px] font-normal text-amber-600 dark:text-amber-400"
                      >
                        <KeyRound className="h-2 w-2" />
                        no key
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
