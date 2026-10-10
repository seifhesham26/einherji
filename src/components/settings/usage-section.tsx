"use client";

import { Gauge, RefreshCw } from "lucide-react";
import { useGetSharedAiCapacity, useGetUsage } from "@/hooks/usage/useGetUsage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsageSection() {
  const quotas = useGetUsage();
  const shared = useGetSharedAiCapacity();
  const isLoading = quotas.isLoading || shared.isLoading;
  const failed = quotas.isError || shared.isError;

  return (
    <section className="space-y-4" aria-labelledby="usage-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="usage-heading" className="flex items-center gap-2 text-base font-semibold">
          <Gauge className="h-4 w-4" aria-hidden /> Usage
        </h2>
        <Button variant="ghost" size="icon" title="Refresh allowances" aria-label="Refresh allowances"
          disabled={quotas.isFetching || shared.isFetching}
          onClick={() => { void quotas.refetch(); void shared.refetch(); }}>
          <RefreshCw className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {isLoading ? <Skeleton className="h-48 w-full" role="status" aria-label="Loading allowances" /> : failed ? (
        <p className="text-sm text-destructive" role="alert">Allowances are unavailable. Refresh to try again.</p>
      ) : (
        <>
          <dl className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-b pb-3 text-sm">
            <div><dt className="text-muted-foreground">Platform AI spending</dt><dd className="font-medium">$0 / month</dd></div>
            <div><dt className="text-muted-foreground">Shared AI capacity</dt><dd className="font-medium">
              {shared.data?.paused ? "Paused" : `${shared.data?.remaining ?? 0} remaining / ${shared.data?.limit ?? 0}`}
            </dd></div>
          </dl>
          <table className="w-full text-sm">
            <caption className="pb-2 text-left text-xs text-muted-foreground">Rolling 24-hour allowances</caption>
            <thead><tr className="border-b text-muted-foreground"><th className="pb-2 text-left font-normal">Action</th>
              <th className="pb-2 text-right font-normal">Used</th><th className="pb-2 text-right font-normal">Remaining</th></tr></thead>
            <tbody>{quotas.data?.map((quota) => (
              <tr key={quota.action} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-normal capitalize break-words">{quota.label}</th>
                <td className="py-2 pl-2 text-right tabular-nums">{quota.used}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{quota.limit === 0 ? "Paused" : `${quota.remaining} / ${quota.limit}`}</td>
              </tr>
            ))}</tbody>
          </table>
          {shared.data?.remaining === 0 && <p className="text-sm text-muted-foreground" role="status">New AI work is unavailable. Saved data remains accessible.</p>}
        </>
      )}
    </section>
  );
}
