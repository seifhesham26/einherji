"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApprovalQueue from "./approval-queue";
import ReadyToSendList from "./ready-to-send-list";
import { useGetReadyToSend } from "@/hooks/messages/useGetReadyToSend";

/**
 * The two halves of outreach: review the drafts, then send the approved ones.
 *
 * They're separate tabs rather than one list because they're different jobs —
 * reviewing is a fast pass through a queue, sending means leaving the app to
 * paste the message somewhere and coming back.
 */
export default function MessagesView() {
  const { data: readyToSend = [] } = useGetReadyToSend();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">To review</TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            Ready to send
            {readyToSend.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
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
