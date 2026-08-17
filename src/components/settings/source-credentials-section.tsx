"use client";

import { useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetCredentialStatuses } from "@/hooks/credentials/useGetCredentialStatuses";
import {
  useRemoveCredentials,
  useSaveCredentials,
} from "@/hooks/credentials/useSaveCredentials";
import { SOURCE_DEFINITIONS, type SourceDefinition } from "@/lib/scrapers/source-registry";

// Only sources that actually take a key belong in this section.
const CREDENTIALED_SOURCES = SOURCE_DEFINITIONS.filter(
  (source) => source.credentialFields.length > 0,
);

export default function SourceCredentialsSection() {
  const { data: statuses = [], isLoading } = useGetCredentialStatuses();

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary shrink-0">
          <KeyRound className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-sm">Source API keys</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optional. Each source stays switched off until you add its key — everything
            else runs without one.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-lg bg-muted/40 animate-pulse" />
      ) : (
        <div className="space-y-3">
          {CREDENTIALED_SOURCES.map((source) => (
            <CredentialCard
              key={source.id}
              source={source}
              isConfigured={
                statuses.find((status) => status.source === source.id)?.isConfigured ?? false
              }
              maskedValues={
                statuses.find((status) => status.source === source.id)?.maskedValues ?? {}
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CredentialCardProps {
  source: SourceDefinition;
  isConfigured: boolean;
  maskedValues: Record<string, string>;
}

function CredentialCard({ source, isConfigured, maskedValues }: CredentialCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});

  const saveCredentials = useSaveCredentials();
  const removeCredentials = useRemoveCredentials();

  async function handleSave() {
    await saveCredentials.mutateAsync({ source: source.id, credentials: values }).catch(
      () => undefined,
    );
    setValues({});
    setIsEditing(false);
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{source.name}</span>
            {isConfigured ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Not configured
              </Badge>
            )}
            {source.costNote && (
              <span className="text-[10px] text-muted-foreground">{source.costNote}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{source.description}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isConfigured && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              title={`Remove ${source.name} credentials`}
              disabled={removeCredentials.isPending}
              onClick={() => removeCredentials.mutate({ source: source.id })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditing((open) => !open)}>
            {isEditing ? "Cancel" : isConfigured ? "Update" : "Add key"}
          </Button>
        </div>
      </div>

      {/* Masked preview — the real secret is never sent to the browser. */}
      {isConfigured && !isEditing && Object.keys(maskedValues).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(maskedValues).map(([key, value]) => (
            <span key={key} className="text-xs text-muted-foreground font-mono">
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="space-y-3 pt-1">
          {source.credentialFields.map((field) => {
            const isRevealed = revealedFields[field.key] ?? false;

            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`${source.id}-${field.key}`} className="text-xs">
                  {field.label}
                </Label>
                <div className="relative">
                  <Input
                    id={`${source.id}-${field.key}`}
                    type={field.isSecret && !isRevealed ? "password" : "text"}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    value={values[field.key] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className={field.isSecret ? "pr-9 font-mono text-sm" : "font-mono text-sm"}
                  />
                  {field.isSecret && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedFields((current) => ({
                          ...current,
                          [field.key]: !isRevealed,
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title={isRevealed ? "Hide" : "Show"}
                    >
                      {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-3 pt-1">
            {source.signupUrl ? (
              <a
                href={source.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                Get a key
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={handleSave} disabled={saveCredentials.isPending} className="gap-2">
              {saveCredentials.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
