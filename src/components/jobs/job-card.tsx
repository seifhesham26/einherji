"use client";

import { Loader2, ExternalLink, Users } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFindManagers } from "@/hooks/jobs/useFindManagers";
import { formatRelativeDate } from "@/utils/format-relative-date";
import type { Job } from "@/types/job";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  const findManagers = useFindManagers();
  const isFinding = findManagers.isPending && findManagers.variables?.jobId === job.id;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{job.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
          </div>
          <Badge variant={job.isProcessed ? "default" : "secondary"} className="shrink-0 text-xs">
            {job.isProcessed ? "Manager Found" : "Pending"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <div className="space-y-1 text-xs text-muted-foreground">
          {job.location && <p>📍 {job.location}</p>}
          {job.salary && <p>💰 {job.salary}</p>}
          {job.companySize && <p>🏢 {job.companySize} employees</p>}
          <p>🕐 {formatRelativeDate(job.postedAt)}</p>
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={(job.isProcessed ?? false) || isFinding}
          onClick={() => findManagers.mutate({ jobId: job.id })}
        >
          {isFinding ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
          ) : (
            <Users className="h-3 w-3 mr-1.5" />
          )}
          {job.isProcessed ? "Found" : "Find Manager"}
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
