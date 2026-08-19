"use client";

import { useState } from "react";
import { Building2, Check, Loader2, Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc-client";
import type { PlaceResult } from "@/lib/places/search-places";

/**
 * Finds businesses to approach, via Google Places.
 *
 * Results are shown and then discarded — Google's terms give no caching
 * exception for names or addresses. Only a business you explicitly save becomes
 * a lead, and from then on it's your record to edit.
 */
export default function FindBusinessesDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [regionCode, setRegionCode] = useState("eg");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);

  const utils = trpc.useUtils();

  // A mutation, not a query: each search is billable, so it must never be
  // re-run by a cache refetch.
  const search = trpc.places.search.useMutation({
    onSuccess: (places) => {
      setResults(places);
      if (places.length === 0) toast.info("No businesses matched that search.");
    },
    onError: (error) => toast.error(error.message ?? "Search failed."),
  });

  const saveAsLead = trpc.places.saveAsLead.useMutation({
    onSuccess: (lead) => {
      utils.leads.getAll.invalidate();
      setSavedPlaceIds((current) => [...current, lead.placeId ?? ""]);
      toast.success(`Saved ${lead.company}.`);
    },
    onError: (error) => toast.error(error.message ?? "Couldn't save that business."),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsOpen(true)}>
        <Building2 className="h-4 w-4" />
        Find businesses
      </Button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find businesses</DialogTitle>
          <DialogDescription>
            Search Google for businesses to approach. Results aren&apos;t stored — save the
            ones you want and they become leads.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="placesQuery">What are you looking for?</Label>
            <Input
              id="placesQuery"
              placeholder="engineering consultancies in Cairo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim().length > 1) {
                  search.mutate({ query, regionCode: regionCode || undefined });
                }
              }}
            />
          </div>
          <div className="w-full sm:w-24 space-y-1.5">
            <Label htmlFor="placesRegion">Country</Label>
            <Input
              id="placesRegion"
              placeholder="eg"
              maxLength={2}
              value={regionCode}
              onChange={(event) => setRegionCode(event.target.value.toLowerCase())}
            />
          </div>
        </div>

        <Button
          className="gap-2"
          disabled={query.trim().length < 2 || search.isPending}
          onClick={() => search.mutate({ query, regionCode: regionCode || undefined })}
        >
          {search.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </Button>

        {results.length > 0 && (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {results.map((place) => {
              const isSaved = savedPlaceIds.includes(place.placeId);

              return (
                <div
                  key={place.placeId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{place.name}</p>
                    {place.category && (
                      <p className="text-xs text-muted-foreground">{place.category}</p>
                    )}
                    {place.address && (
                      <p className="text-xs text-muted-foreground mt-0.5">{place.address}</p>
                    )}
                    {place.phone && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {place.phone}
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isSaved ? "ghost" : "outline"}
                    className="shrink-0 gap-2"
                    disabled={isSaved || saveAsLead.isPending}
                    onClick={() =>
                      saveAsLead.mutate({
                        placeId: place.placeId,
                        name: place.name,
                        address: place.address ?? undefined,
                        phone: place.phone ?? undefined,
                        website: place.website ?? undefined,
                        category: place.category ?? undefined,
                      })
                    }
                  >
                    {isSaved ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                    {isSaved ? "Saved" : "Save as lead"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Each search is billed by Google and counts against your daily quota.
        </p>
      </DialogContent>
    </Dialog>
  );
}
