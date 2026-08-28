"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetMuteRules } from "@/hooks/mute-rules/useGetMuteRules";
import { useCreateMuteRule } from "@/hooks/mute-rules/useCreateMuteRule";
import { useDeleteMuteRule } from "@/hooks/mute-rules/useDeleteMuteRule";
import {
  MUTE_RULE_KIND_LABELS,
  muteRuleKindValues,
  type MuteRuleKind,
} from "@/mute-rules/mute-rules.validators";

/**
 * The permanent "not this, ever" list.
 *
 * Dismissing the same staffing agency for the fortieth time is the clearest
 * signal a job hunter can give, and until now the app threw it away every time.
 * A rule is checked when a scrape writes, so a muted posting never occupies a
 * row, never lands in a count and never comes back on the next run.
 */
export default function MuteRulesSection() {
  const [kind, setKind] = useState<MuteRuleKind>("company");
  const [pattern, setPattern] = useState("");

  const { data: rules, isLoading } = useGetMuteRules();
  const createRule = useCreateMuteRule();
  const deleteRule = useDeleteMuteRule();

  function addRule() {
    const trimmed = pattern.trim();
    if (trimmed.length < 2) return;

    createRule.mutate(
      { kind, pattern: trimmed, dismissExisting: true },
      { onSuccess: () => setPattern("") },
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <VolumeX className="h-4 w-4" aria-hidden />
          Muted companies and titles
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Anything matching a rule is dropped as it&apos;s scraped, so it never reaches your list.
          Adding a rule also dismisses what it already matches.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="mute-rule-kind">Match on</Label>
          <Select
            value={kind}
            onValueChange={(value) => value && setKind(value as MuteRuleKind)}
          >
            <SelectTrigger id="mute-rule-kind" size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {muteRuleKindValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {MUTE_RULE_KIND_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="mute-rule-pattern">
            {kind === "company" ? "Company name" : "Word or phrase in the title"}
          </Label>
          <Input
            id="mute-rule-pattern"
            value={pattern}
            placeholder={kind === "company" ? "Robert Half" : "intern"}
            onChange={(event) => setPattern(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addRule();
            }}
          />
        </div>

        <Button
          size="sm"
          onClick={addRule}
          disabled={createRule.isPending || pattern.trim().length < 2}
        >
          {createRule.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-3.5 w-3.5" aria-hidden />
          )}
          Mute
        </Button>
      </div>

      {/* Said plainly, because it is the one surprise this feature has: a rule
          is a prefix match, not an exact one. */}
      <p className="text-xs text-muted-foreground">
        Matching ignores case and is loose at the end — <span className="font-medium">recruit</span>{" "}
        also catches <span className="font-medium">Recruiting</span> and{" "}
        <span className="font-medium">Recruiters</span>.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : rules && rules.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-3 px-3 py-2">
              <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                {MUTE_RULE_KIND_LABELS[rule.kind]}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm">{rule.pattern}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={deleteRule.isPending}
                onClick={() => deleteRule.mutate({ id: rule.id })}
                aria-label={`Stop muting ${rule.pattern}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nothing muted. The fastest way to add one is the{" "}
          <span className="font-medium">Mute company</span> button on a job&apos;s detail panel.
        </p>
      )}
    </section>
  );
}
