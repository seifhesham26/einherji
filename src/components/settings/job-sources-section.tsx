"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Database, KeyRound, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetSettings } from "@/hooks/settings/useGetSettings";
import { useUpdateJobSources } from "@/hooks/settings/useUpdateJobSources";
import { useGetCredentialStatuses } from "@/hooks/credentials/useGetCredentialStatuses";
import { SOURCE_DEFINITIONS, type SourceTier } from "@/lib/scrapers/source-registry";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";

const DEFAULT_SOURCES: JobSourceName[] = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "remoteok",
  "arbeitnow",
];

const TIER_LABELS: { tier: SourceTier; title: string; hint: string }[] = [
  {
    tier: "company_board",
    title: "Company job boards",
    hint: "Pulls from your target companies",
  },
  {
    tier: "aggregator",
    title: "Job aggregators",
    hint: "Searches by your criteria — no company list needed",
  },
  {
    tier: "marketplace",
    title: "Freelance & contract work",
    hint: "Client projects and gigs",
  },
  {
    tier: "scraped",
    title: "Scraped sources",
    hint: "Slower and rate-limited, but broad",
  },
];

export default function JobSourcesSection() {
  const { data: settings, isLoading } = useGetSettings();
  const { data: credentialStatuses = [] } = useGetCredentialStatuses();
  const updateJobSources = useUpdateJobSources();

  // null means "untouched, show whatever the server has". Deriving rather than
  // syncing server data into state with an effect avoids a cascading render and
  // keeps the saved values authoritative until the user actually clicks something.
  const [edited, setEdited] = useState<JobSourceName[] | null>(null);
  const selected = edited ?? (settings?.jobSources as JobSourceName[] | undefined) ?? DEFAULT_SOURCES;

  const configuredSources = new Set(
    credentialStatuses.filter((status) => status.isConfigured).map((status) => status.source),
  );

  function toggleSource(sourceId: JobSourceName) {
    setEdited(
      selected.includes(sourceId)
        ? selected.filter((id) => id !== sourceId)
        : [...selected, sourceId],
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary shrink-0">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">Job sources</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Where we look when you run a scrape. {selected.length} selected.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 rounded-lg bg-muted/40 animate-pulse" />
      ) : (
        <div className="space-y-5">
          {TIER_LABELS.map(({ tier, title, hint }) => {
            const sources = SOURCE_DEFINITIONS.filter((source) => source.tier === tier);
            if (sources.length === 0) return null;

            return (
              <div key={tier} className="space-y-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xs font-medium">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{hint}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sources.map((source) => {
                    const isSelected = selected.includes(source.id);
                    const needsKey = source.credentialFields.length > 0;
                    const hasKey = configuredSources.has(source.id);

                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => toggleSource(source.id)}
                        className={cn(
                          "text-left rounded-lg border p-3 transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{source.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{source.description}</p>

                        {/* A selected source with no key is silently skipped at
                            run time, so say so here rather than let it look active. */}
                        {needsKey && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-2 text-[10px] font-normal gap-1",
                              isSelected && !hasKey && "border-amber-500/50 text-amber-600 dark:text-amber-400",
                            )}
                          >
                            <KeyRound className="h-2.5 w-2.5" />
                            {hasKey ? "Key saved" : "Needs an API key"}
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
      )}

      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="text-xs text-muted-foreground">
          Board sources pull from your{" "}
          <Link href="/companies" className="underline underline-offset-4 hover:no-underline">
            target companies
          </Link>
          . Everything else uses your search criteria.
        </p>
        <Button
          size="sm"
          disabled={updateJobSources.isPending || selected.length === 0}
          onClick={() => updateJobSources.mutate({ jobSources: selected })}
          className="gap-2 shrink-0"
        >
          {updateJobSources.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
