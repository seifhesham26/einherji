"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApprovalQueue from "./approval-queue";
import ReadyToSendList from "./ready-to-send-list";
import { useQueryFilter } from "@/hooks/useQueryFilter";
import { useGetMessages } from "@/hooks/messages/useGetMessages";
import { useGetReadyToSend } from "@/hooks/messages/useGetReadyToSend";

const TABS = ["review", "send"] as const;
type MessagesTab = (typeof TABS)[number];

/**
 * The two halves of outreach: review the drafts, then send the approved ones.
 *
 * They're separate tabs rather than one list because they're different jobs —
 * reviewing is a fast pass through a queue, sending means leaving the app to
 * paste the message somewhere and coming back.
 */
export default function MessagesView() {
  const { data: readyToSend = [] } = useGetReadyToSend();
  const { data: drafts = [] } = useGetMessages("draft");

  // In the URL, so coming back to the send tab after pasting a message into
  // LinkedIn lands where you left rather than back at the top of the queue.
  const [tabParam, setTab] = useQueryFilter("tab");
  const activeTab: MessagesTab = TABS.includes(tabParam as MessagesTab)
    ? (tabParam as MessagesTab)
    : "review";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review what the AI wrote, then send the ones you approved.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setTab(value === "review" ? null : value)}>
        <TabsList>
          <TabsTrigger value="review" className="gap-2">
            To review
            {drafts.length > 0 && (
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            Ready to send
            {readyToSend.length > 0 && (
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {readyToSend.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-6">
          <ApprovalQueue />
        </TabsContent>

        <TabsContent value="send" className="mt-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Ready to send</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Copy each message and send it yourself, then mark it sent so the tracker
                stays accurate.
              </p>
            </div>
            <ReadyToSendList />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
