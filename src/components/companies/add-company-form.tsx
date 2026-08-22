"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddCompany } from "@/hooks/companies/useAddCompany";
import { addCompanySchema, type AddCompanyInput } from "@/companies/companies.validators";

export default function AddCompanyForm() {
  const addCompany = useAddCompany();

  const form = useForm<AddCompanyInput>({
    resolver: zodResolver(addCompanySchema),
    defaultValues: { name: "", careersUrl: "" },
  });

  async function handleAdd(companyData: AddCompanyInput) {
    try {
      await addCompany.mutateAsync(companyData);
      // Only on success. Clearing regardless meant a duplicate name or a network
      // blip threw away what had just been typed, with a toast as the only clue.
      form.reset({ name: "", careersUrl: "" });
    } catch {
      // The mutation surfaces the reason; the form keeps its values so the user
      // can fix the name and submit again.
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleAdd)}
      className="rounded-xl border border-border bg-card p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="company-name">Company name</Label>
          <Input id="company-name" placeholder="Stripe" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="careers-url">
            Careers page <span className="text-muted-foreground font-normal">— optional</span>
          </Label>
          <Input
            id="careers-url"
            placeholder="https://stripe.com/jobs"
            {...form.register("careersUrl")}
          />
          {form.formState.errors.careersUrl && (
            <p className="text-xs text-destructive">
              {form.formState.errors.careersUrl.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          We&apos;ll look for their Greenhouse, Lever, Ashby, or Workable board. Adding the
          careers page makes detection more reliable.
        </p>
        <Button type="submit" disabled={addCompany.isPending} className="gap-2 shrink-0">
          {addCompany.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add company
        </Button>
      </div>
    </form>
  );
}
