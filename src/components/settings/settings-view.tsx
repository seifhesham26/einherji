"use client";

import { Separator } from "@/components/ui/separator";
import ProfileSection from "./profile-section";
import IntegrationsSection from "./integrations-section";

export default function SettingsView() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and integrations.</p>
      </div>

      <ProfileSection />

      <Separator />

      <IntegrationsSection />
    </div>
  );
}
