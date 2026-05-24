import type { messages, leads, jobs } from "@/lib/db/schema";

export type Message = typeof messages.$inferSelect;
export type MessageStatus = NonNullable<Message["status"]>;

export type MessageWithContext = {
  message: Message;
  lead: typeof leads.$inferSelect | null;
  job: typeof jobs.$inferSelect | null;
};
