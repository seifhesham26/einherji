"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Save, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetSettings } from "@/hooks/settings/useGetSettings";
import { useUpdateIntegrations } from "@/hooks/settings/useUpdateIntegrations";
import { updateIntegrationsSchema, type UpdateIntegrationsInput } from "@/settings/settings.validators";

export default function IntegrationsSection() {
  const [showToken, setShowToken] = useState(false);
  const { data: settings, isLoading } = useGetSettings();
  const updateIntegrations = useUpdateIntegrations();

  const form = useForm<UpdateIntegrationsInput>({
    resolver: zodResolver(updateIntegrationsSchema),
    defaultValues: { apifyApiToken: "" },
  });

  useEffect(() => {
    if (settings !== undefined) {
      form.reset({ apifyApiToken: settings?.apifyApiToken ?? "" });
    }
  }, [settings, form]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Integrations</CardTitle>
            <CardDescription className="text-xs mt-0.5">Connect external services to power your job hunt.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit((data) => updateIntegrations.mutate(data))}
            className="space-y-4"
          >
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-orange-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-orange-500">A</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Apify</p>
                  <p className="text-xs text-muted-foreground">
                    Required for scraping LinkedIn jobs and finding hiring managers.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apifyApiToken">API Token</Label>
                <div className="relative">
                  <Input
                    id="apifyApiToken"
                    type={showToken ? "text" : "password"}
                    placeholder="apify_api_xxxxxxxx…"
                    className="pr-10 font-mono text-sm"
                    {...form.register("apifyApiToken")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Find your token at{" "}
                  <a
                    href="https://console.apify.com/account/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    console.apify.com/account/integrations
                  </a>
                </p>
              </div>
            </div>

            <Button type="submit" size="sm" disabled={updateIntegrations.isPending} className="gap-2">
              {updateIntegrations.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Key
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
