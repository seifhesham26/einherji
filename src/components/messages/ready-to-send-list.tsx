"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetReadyToSend } from "@/hooks/messages/useGetReadyToSend";
import { trpc } from "@/lib/trpc-client";
import { useMarkMessageSent } from "@/hooks/messages/useMarkMessageSent";
import type { MessageWithContext } from "@/types/message";

// Long enough to read as confirmation, short enough not to look stuck.
const COPIED_FEEDBACK_MS = 2000;

/**
 * Approved messages waiting to actually be sent.
 *
 * Sending is manual by design: the app has no email address for a lead, because
 * the profile scraper doesn't return one. So this hands over the text and records
 * that you sent it — which is the step that was missing entirely, leaving `sentAt`
 * permanently null and the tracker unable to tell approved from contacted.
 */
export default function ReadyToSendList() {
  const { data: messages = [], isLoading } = useGetReadyToSend();
  const { data: sentToday = 0 } = trpc.messages.getSentTodayCount.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center">
        <p className="text-sm font-medium">Nothing waiting to send</p>
        <p className="text-xs text-muted-foreground mt-1">
          {sentToday > 0
            ? `You sent ${sentToday} message${sentToday === 1 ? "" : "s"} today.`
            : "Approved messages show up here, ready to copy."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((item) => (
        <ReadyToSendCard key={item.message.id} item={item} />
      ))}
    </div>
  );
}

function ReadyToSendCard({ item }: { item: MessageWithContext }) {
  const [hasCopied, setHasCopied] = useState(false);
  const markSent = useMarkMessageSent();

  // An edited message is the version the user rewrote — that's what they'll send.
  const bodyToSend = item.message.editedBody ?? item.message.body;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bodyToSend);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // Silent failure would look like the button doing nothing at all.
      setHasCopied(false);
    }
  }

  const leadName = [item.lead?.firstName, item.lead?.lastName].filter(Boolean).join(" ");

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{leadName || "Unknown contact"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {item.lead?.title ?? "—"} · {item.lead?.company ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.message.status === "edited" && (
              <Badge variant="outline" className="text-[10px]">
                Edited
              </Badge>
            )}
            {item.job && (
              <Badge variant="secondary" className="text-[10px] max-w-[12rem] truncate">
                {item.job.title}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-sm">
          {bodyToSend}
        </p>
      </CardContent>

      <CardFooter className="gap-2 flex-wrap border-t border-border pt-3">
        <Button onClick={handleCopy} variant="outline" className="gap-2">
          {hasCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          {hasCopied ? "Copied" : "Copy message"}
        </Button>

        {/* A plain anchor rather than a Button — this component has no asChild. */}
        {item.lead?.linkedinUrl && (
          <a
            href={item.lead.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", className: "gap-2" })}
          >
            <ExternalLink className="h-4 w-4" />
            Open profile
          </a>
        )}

        <Button
          onClick={() => markSent.mutate({ messageId: item.message.id })}
          disabled={markSent.isPending}
          className="ml-auto gap-2"
        >
          {markSent.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Mark as sent
        </Button>
      </CardFooter>
    </Card>
  );
}
