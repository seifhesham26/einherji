"use client";

import { Loader2, ExternalLink, Users, MapPin, DollarSign, Building2, Clock } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFindManagers } from "@/hooks/jobs/useFindManagers";
import { formatRelativeDate } from "@/utils/format-relative-date";
import type { Job } from "@/types/job";

interface JobCardProps {
  job: Job;
}

function CompanyAvatar({ name }: { name: string }) {
  const letter = name[0]?.toUpperCase() ?? "?";
  return (
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-primary">{letter}</span>
    </div>
  );
}

export default function JobCard({ job }: JobCardProps) {
  const findManagers = useFindManagers();
  const isFinding = findManagers.isPending && findManagers.variables?.jobId === job.id;

  return (
    <Card className="flex flex-col rounded-xl transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <CompanyAvatar name={job.company} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight line-clamp-2">{job.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.company}</p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs ${
              job.isProcessed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {job.isProcessed ? "Done" : "Pending"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="space-y-1.5">
          {job.location && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.location}</span>
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3 shrink-0" />
              <span className="truncate">{job.salary}</span>
            </div>
          )}
          {job.companySize && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span>{job.companySize} employees</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatRelativeDate(job.postedAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          variant={job.isProcessed ? "secondary" : "outline"}
          className="flex-1"
          disabled={(job.isProcessed ?? false) || isFinding}
          onClick={() => findManagers.mutate({ jobId: job.id })}
        >
          {isFinding ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
          ) : (
            <Users className="h-3 w-3 mr-1.5" />
          )}
          {job.isProcessed ? "Manager found" : "Find Manager"}
        </Button>
        <a
          href={job.jobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  );
}
