"use client";

import { useState } from "react";
import { Check, Clock, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetSettings } from "@/hooks/settings/useGetSettings";
import { useUpdateDigest } from "@/hooks/settings/useUpdateDigest";
import { useConnectTelegram } from "@/hooks/settings/useConnectTelegram";
import { formatRelativeDate } from "@/utils/format-relative-date";

/**
 * Switch for the nightly scrape and its email.
 *
 * Off by default: it spends the account's own scrape quota and sends them mail,
 * so it has to be asked for.
 */
export default function DailyRunSection() {
  const { data: settings, isLoading } = useGetSettings();
  const updateDigest = useUpdateDigest();
  const connectTelegram = useConnectTelegram();

  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");

  const isEnabled = settings?.dailyDigestEnabled ?? false;
  const channels = settings?.digestChannels ?? ["email"];
  const isTelegramConnected = settings?.hasTelegramBotToken ?? false;

  function toggleChannel(channel: "email" | "telegram") {
    const next = channels.includes(channel)
      ? channels.filter((entry) => entry !== channel)
      : [...channels, channel];

    // Removing the last channel would leave the run with nowhere to report.
    if (next.length === 0) return;
    updateDigest.mutate({ digestChannels: next as ("email" | "telegram")[] });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Daily run</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Scrape your sources each morning and email you the best matches.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="h-16 rounded-lg bg-muted/40 animate-pulse" />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isEnabled ? "On — runs at 06:00 UTC" : "Off"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEnabled
                  ? settings?.lastDigestSentAt
                    ? `Last run ${formatRelativeDate(new Date(settings.lastDigestSentAt))}.`
                    : "First run hasn't happened yet."
                  : "You'll only see new jobs when you open the app and scrape manually."}
              </p>
            </div>

            <Button
              variant={isEnabled ? "outline" : "default"}
              size="sm"
              className="gap-2 shrink-0"
              disabled={updateDigest.isPending}
              onClick={() => updateDigest.mutate({ dailyDigestEnabled: !isEnabled })}
            >
              {updateDigest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEnabled ? "Turn off" : "Turn on"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Uses one of your daily scrapes. Nothing is sent on a day with no new jobs.
        </p>

        {/* ── Where it goes ── */}
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium">Send it to</p>

          <div className="flex flex-wrap gap-2">
            {(["email", "telegram"] as const).map((channel) => (
              <Button
                key={channel}
                type="button"
                size="sm"
                variant={channels.includes(channel) ? "default" : "outline"}
                className="gap-2 capitalize"
                disabled={updateDigest.isPending || (channel === "telegram" && !isTelegramConnected)}
                onClick={() => toggleChannel(channel)}
              >
                {channels.includes(channel) && <Check className="h-3.5 w-3.5" />}
                {channel}
              </Button>
            ))}
          </div>

          {!isTelegramConnected && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Connect Telegram</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Free and unlimited, and it lands on your phone. Message{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    @BotFather
                  </a>{" "}
                  → <code>/newbot</code> for a token. Then message your new bot once and open{" "}
                  <code>api.telegram.org/bot&lt;token&gt;/getUpdates</code> to find your chat id.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telegramBotToken">Bot token</Label>
                <Input
                  id="telegramBotToken"
                  type="password"
                  placeholder="123456:ABC-DEF…"
                  className="font-mono text-sm"
                  value={botToken}
                  onChange={(event) => setBotToken(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telegramChatId">Chat ID</Label>
                <Input
                  id="telegramChatId"
                  placeholder="987654321"
                  className="font-mono text-sm"
                  value={chatId}
                  onChange={(event) => setChatId(event.target.value)}
                />
              </div>

              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={!botToken || !chatId || connectTelegram.isPending}
                onClick={() =>
                  connectTelegram.mutate(
                    { telegramBotToken: botToken, telegramChatId: chatId },
                    { onSuccess: () => { setBotToken(""); setChatId(""); } },
                  )
                }
              >
                {connectTelegram.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Connect &amp; send test
              </Button>
            </div>
          )}

          {isTelegramConnected && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Telegram connected.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={connectTelegram.isPending}
                onClick={() => connectTelegram.mutate({})}
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
