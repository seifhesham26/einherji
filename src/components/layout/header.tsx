"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, AlertTriangle, Loader2, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession, sendVerificationEmail } from "@/lib/auth-client";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/": "Dashboard",
  "/criteria": "Search Criteria",
  "/companies": "Companies",
  "/jobs": "Jobs",
  "/leads": "Leads",
  "/messages": "Messages",
  "/tracker": "Tracker",
  "/settings": "Settings",
};

export default function Header({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [isResending, setIsResending] = useState(false);

  const isUnverified = session && !session.user.emailVerified;

  async function handleResendVerification() {
    if (!session?.user.email) return;
    setIsResending(true);
    const { error } = await sendVerificationEmail({
      email: session.user.email,
      callbackURL: "/dashboard",
    });
    setIsResending(false);
    if (error) {
      toast.error("Failed to resend verification email.");
    } else {
      toast.success("Verification email sent! Check your inbox.");
    }
  }

  return (
    <div className="shrink-0">
      <header className="h-14 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="shrink-0 text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold truncate">{PAGE_TITLES[pathname] ?? ""}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </header>

      {/* Email verification banner */}
      {isUnverified && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400 flex-1">
            Your email address is not verified yet.{" "}
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="underline underline-offset-4 hover:no-underline font-medium disabled:opacity-60 inline-flex items-center gap-1"
            >
              {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
              Resend verification email
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
