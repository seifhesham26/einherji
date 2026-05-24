"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Save, Bot, Briefcase, Building2, FileText, MapPin, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TagInput } from "@/components/ui/tag-input";
import CvUpload from "./cv-upload";
import { useGetActiveCriteria } from "@/hooks/criteria/useGetActiveCriteria";
import { useSaveCriteria } from "@/hooks/criteria/useSaveCriteria";
import { saveCriteriaSchema, AVAILABLE_MODELS, DEFAULT_MODEL, type SaveCriteriaInput } from "@/criteria/criteria.validators";
import { SKILL_SUGGESTIONS, JOB_TITLE_SUGGESTIONS, LOCATION_SUGGESTIONS } from "@/lib/suggestions";
import type { ExtractedCvData } from "@/lib/cv-parser";

const INDUSTRIES = [
  "SaaS", "Fintech", "E-commerce", "Healthcare", "Finance",
  "Education", "Legal", "Marketing", "AI/ML", "Cybersecurity",
  "Real Estate", "Gaming",
];

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export default function CriteriaForm() {
  const { data: activeCriteria, isLoading } = useGetActiveCriteria();
  const saveCriteria = useSaveCriteria();

  const form = useForm<SaveCriteriaInput>({
    resolver: zodResolver(saveCriteriaSchema),
    defaultValues: {
      titles: [],
      locations: [],
      industries: [],
      skills: [],
      model: DEFAULT_MODEL,
      salaryMin: undefined,
      companySizeMin: 1,
      companySizeMax: 5000,
    },
  });

  useEffect(() => {
    if (activeCriteria) {
      form.reset({
        titles: activeCriteria.titles ?? [],
        locations: activeCriteria.locations ?? [],
        industries: activeCriteria.industries ?? [],
        skills: activeCriteria.skills ?? [],
        salaryMin: activeCriteria.salaryMin ?? undefined,
        companySizeMin: activeCriteria.companySizeMin ?? 1,
        companySizeMax: activeCriteria.companySizeMax ?? 5000,
        resumeText: activeCriteria.resumeText ?? "",
        elevatorPitch: activeCriteria.elevatorPitch ?? "",
        model: activeCriteria.model ?? DEFAULT_MODEL,
      });
    }
  }, [activeCriteria, form]);

  function handleCvExtracted(data: ExtractedCvData) {
    if (data.skills.length > 0) {
      const currentSkills = form.getValues("skills") ?? [];
      const merged = [...new Set([...currentSkills, ...data.skills])];
      form.setValue("skills", merged);
    }
    if (data.suggestedTitles.length > 0) {
      const currentTitles = form.getValues("titles") ?? [];
      const merged = [...new Set([...currentTitles, ...data.suggestedTitles])];
      form.setValue("titles", merged);
    }
    if (data.elevatorPitch) form.setValue("elevatorPitch", data.elevatorPitch);
    if (data.resumeText) form.setValue("resumeText", data.resumeText);
  }

  const companySizeMin = form.watch("companySizeMin") ?? 1;
  const companySizeMax = form.watch("companySizeMax") ?? 5000;
  const selectedIndustries = form.watch("industries") ?? [];

  function toggleIndustry(industry: string) {
    const current = form.getValues("industries") ?? [];
    form.setValue(
      "industries",
      current.includes(industry) ? current.filter((i) => i !== industry) : [...current, industry]
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit((data) => saveCriteria.mutate(data))} className="space-y-8 max-w-2xl">

      {/* ── CV Upload ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-background p-5 space-y-4">
        <SectionHeader
          icon={<Sparkles className="h-4 w-4" />}
          title="Import from CV"
          description="Upload your PDF and we'll extract your skills, experience and suggest job titles."
        />
        <CvUpload onExtracted={handleCvExtracted} />
      </div>

      <Separator />

      {/* ── Target Role ───────────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader
          icon={<Briefcase className="h-4 w-4" />}
          title="Target Role"
          description="What positions are you applying for?"
        />

        <div className="space-y-4 pl-11">
          <div className="space-y-1.5">
            <Label>Job Titles</Label>
            <Controller
              name="titles"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder='e.g. "Senior Frontend Engineer" — press Enter to add'
                  suggestions={JOB_TITLE_SUGGESTIONS}
                />
              )}
            />
            {form.formState.errors.titles && (
              <p className="text-xs text-destructive">{form.formState.errors.titles.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Locations</Label>
            <Controller
              name="locations"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder='e.g. "Remote" or "New York, NY"'
                  suggestions={LOCATION_SUGGESTIONS}
                />
              )}
            />
            {form.formState.errors.locations && (
              <p className="text-xs text-destructive">{form.formState.errors.locations.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Minimum Salary</Label>
            <div className="relative max-w-48">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">$</span>
              <Input
                type="number"
                className="pl-7"
                placeholder="80,000"
                {...form.register("salaryMin", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Company Preferences ───────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader
          icon={<Building2 className="h-4 w-4" />}
          title="Company Preferences"
          description="Filter the kinds of companies you want to target."
        />

        <div className="space-y-4 pl-11">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Company Size</Label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {companySizeMin.toLocaleString()}–{companySizeMax.toLocaleString()} employees
              </span>
            </div>
            <Slider
              min={1}
              max={10000}
              step={50}
              value={[companySizeMin, companySizeMax]}
              onValueChange={(values) => {
                const [min, max] = values as number[];
                form.setValue("companySizeMin", min);
                form.setValue("companySizeMax", max);
              }}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>Startup</span>
              <span>Mid</span>
              <span>Enterprise</span>
              <span>10k+</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Industries</Label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((industry) => (
                <button key={industry} type="button" onClick={() => toggleIndustry(industry)}>
                  <Badge
                    variant={selectedIndustries.includes(industry) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      selectedIndustries.includes(industry) ? "" : "hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {industry}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Skills</Label>
            <p className="text-xs text-muted-foreground">
              Used to match you to roles and personalize messages. Start typing to see suggestions.
            </p>
            <Controller
              name="skills"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder='e.g. "React", "TypeScript"'
                  suggestions={SKILL_SUGGESTIONS}
                />
              )}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── Your Background ───────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader
          icon={<FileText className="h-4 w-4" />}
          title="Your Background"
          description="The AI reads this to write personalized outreach messages on your behalf."
        />

        <div className="space-y-4 pl-11">
          <div className="space-y-1.5">
            <Label>Resume Text</Label>
            <p className="text-xs text-muted-foreground">
              Plain text version of your CV. Include specific achievements with numbers (e.g. "Reduced load time by 40%").
            </p>
            <Textarea
              rows={9}
              placeholder="Paste your resume here…"
              className="font-mono text-xs resize-y"
              {...form.register("resumeText")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Elevator Pitch</Label>
            <p className="text-xs text-muted-foreground">
              2–3 sentences. This opens every outreach message.
            </p>
            <Textarea
              rows={3}
              placeholder="I'm a senior frontend engineer with 5 years building React products at scale…"
              {...form.register("elevatorPitch")}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* ── AI Model ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <SectionHeader
          icon={<Bot className="h-4 w-4" />}
          title="AI Model"
          description="Selects which model generates your outreach messages."
        />

        <div className="pl-11">
          <Controller
            name="model"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* ── Save ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saveCriteria.isPending} className="gap-2">
          {saveCriteria.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save criteria
        </Button>
        {saveCriteria.isSuccess && (
          <p className="text-sm text-muted-foreground">Saved.</p>
        )}
      </div>
    </form>
  );
}
