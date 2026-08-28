"use client";

import { Separator } from "@/components/ui/separator";
import ProfileSection from "./profile-section";
import JobSourcesSection from "./job-sources-section";
import DailyRunSection from "./daily-run-section";
import MuteRulesSection from "./mute-rules-section";
import SourceCredentialsSection from "./source-credentials-section";
import IntegrationsSection from "./integrations-section";

export default function SettingsView() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, job sources, what to ignore, and integrations.
        </p>
      </div>

      <ProfileSection />

      <Separator />

      <JobSourcesSection />

      <Separator />

      {/* Directly under the sources it filters: a rule is the other half of
          deciding what a scrape is allowed to bring back. */}
      <MuteRulesSection />

      <Separator />

      <DailyRunSection />

      <Separator />

      <SourceCredentialsSection />

      <Separator />

      <IntegrationsSection />
    </div>
  );
}
