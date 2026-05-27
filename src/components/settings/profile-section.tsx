"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetSettings } from "@/hooks/settings/useGetSettings";
import { useUpdateProfile } from "@/hooks/settings/useUpdateProfile";
import { useSession, updateUser } from "@/lib/auth-client";
import { updateProfileSchema, type UpdateProfileInput } from "@/settings/settings.validators";

export default function ProfileSection() {
  const { data: session } = useSession();
  const { data: settings, isLoading } = useGetSettings();
  const updateProfile = useUpdateProfile();

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: "", jobTitle: "", linkedinUrl: "" },
  });

  useEffect(() => {
    if (session?.user && settings !== undefined) {
      form.reset({
        name: session.user.name ?? "",
        jobTitle: settings?.jobTitle ?? "",
        linkedinUrl: settings?.linkedinUrl ?? "",
      });
    }
  }, [session?.user, settings, form]);

  async function onSubmit(data: UpdateProfileInput) {
    // Update the better-auth display name separately
    if (data.name !== session?.user.name) {
      const { error } = await updateUser({ name: data.name });
      if (error) {
        toast.error(error.message ?? "Failed to update name.");
        return;
      }
    }
    // Save profile extras (job title, linkedin) to user settings
    await updateProfile.mutateAsync({
      name: data.name,
      jobTitle: data.jobTitle,
      linkedinUrl: data.linkedinUrl,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription className="text-xs mt-0.5">Your public display information.</CardDescription>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Display Name</Label>
                <Input id="name" placeholder="Your name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" placeholder="e.g. Senior Frontend Engineer" {...form.register("jobTitle")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/your-profile"
                {...form.register("linkedinUrl")}
              />
              {form.formState.errors.linkedinUrl && (
                <p className="text-xs text-destructive">{form.formState.errors.linkedinUrl.message}</p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm" disabled={updateProfile.isPending} className="gap-2">
                {updateProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Profile
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
