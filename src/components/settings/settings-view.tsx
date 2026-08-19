"use client";

import { Separator } from "@/components/ui/separator";
import ProfileSection from "./profile-section";
import JobSourcesSection from "./job-sources-section";
import DailyRunSection from "./daily-run-section";
import SourceCredentialsSection from "./source-credentials-section";
import IntegrationsSection from "./integrations-section";

export default function SettingsView() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, job sources, and integrations.
        </p>
      </div>

      <ProfileSection />

      <Separator />

      <JobSourcesSection />

      <Separator />

      <DailyRunSection />

      <Separator />

      <SourceCredentialsSection />

      <Separator />

      <IntegrationsSection />
    </div>
  );
}
