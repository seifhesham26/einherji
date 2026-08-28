"use client";

import { useState } from "react";
import { Brain, Eye, EyeOff, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSettings } from "@/hooks/settings/useGetSettings";
import { useUpdateAiKeys } from "@/hooks/settings/useUpdateAiKeys";

/**
 * Whose bill the AI runs on.
 *
 * Every other third-party key in this app was already per-account and encrypted
 * at rest. The AI keys were the exception — one server-wide key paying for
 * everyone's cover letters — which works exactly until a second person signs up.
 *
 * Without a key here the server's own is used, which is the right behaviour for
 * a single-user install and is said plainly rather than left to be discovered.
 */
export default function AiKeysSection() {
  const { data: settings, isLoading } = useGetSettings();
  const updateAiKeys = useUpdateAiKeys();

  const [openrouterDraft, setOpenrouterDraft] = useState("");
  const [openaiDraft, setOpenaiDraft] = useState("");

  function save() {
    const openrouterApiKey = openrouterDraft.trim();
    const openaiApiKey = openaiDraft.trim();
    if (!openrouterApiKey && !openaiApiKey) return;

    updateAiKeys.mutate(
      {
        // Only what was actually typed. A blank field means "leave it alone" —
        // the saved key never reaches the browser, so the form can't re-submit
        // it, and treating blank as a deletion would wipe it on every save.
        ...(openrouterApiKey ? { openrouterApiKey } : {}),
        ...(openaiApiKey ? { openaiApiKey } : {}),
      },
      {
        onSuccess: () => {
          setOpenrouterDraft("");
          setOpenaiDraft("");
        },
      },
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Brain className="h-4 w-4" aria-hidden />
          AI keys
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fit reports, cover letters, job analysis and outreach all run on these. Leave them
          empty and this server&apos;s own key pays instead.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <KeyField
            id="openrouter-key"
            label="OpenRouter"
            hint="Covers every model in the Criteria list, including the free ones."
            placeholder="sk-or-v1-…"
            value={openrouterDraft}
            onChange={setOpenrouterDraft}
            savedPreview={settings?.openrouterApiKeyPreview ?? null}
            onClear={() => updateAiKeys.mutate({ openrouterApiKey: null })}
            isPending={updateAiKeys.isPending}
          />

          <KeyField
            id="openai-key"
            label="OpenAI"
            hint="Optional. Used only for gpt- models, where going direct is cheaper than through OpenRouter."
            placeholder="sk-…"
            value={openaiDraft}
            onChange={setOpenaiDraft}
            savedPreview={settings?.openaiApiKeyPreview ?? null}
            onClear={() => updateAiKeys.mutate({ openaiApiKey: null })}
            isPending={updateAiKeys.isPending}
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={save}
              disabled={
                updateAiKeys.isPending ||
                (openrouterDraft.trim().length === 0 && openaiDraft.trim().length === 0)
              }
            >
              {updateAiKeys.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden />
              )}
              Save keys
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

interface KeyFieldProps {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** The masked tail of what's stored, or null. The real key never leaves the server. */
  savedPreview: string | null;
  onClear: () => void;
  isPending: boolean;
}

function KeyField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  savedPreview,
  onClear,
  isPending,
}: KeyFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {savedPreview && (
          <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
            Saved · {savedPreview}
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            // Never pre-filled: the saved key stays on the server, so all the
            // browser knows is that one exists and how it ends.
            type={isVisible ? "text" : "password"}
            value={value}
            placeholder={savedPreview ? "Enter a new key to replace it" : placeholder}
            className="pr-9"
            autoComplete="off"
            onChange={(event) => onChange(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setIsVisible((current) => !current)}
            aria-label={isVisible ? `Hide the ${label} key` : `Show the ${label} key`}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {isVisible ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>

        {/* Removing a key is its own action rather than an empty save, so the
            form can keep treating blank as "leave it alone". */}
        {savedPreview && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={onClear}
            aria-label={`Remove the saved ${label} key`}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
