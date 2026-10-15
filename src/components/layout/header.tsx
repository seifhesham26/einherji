"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, AlertTriangle, Loader2, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsHydrated } from "@/hooks/useIsHydrated";
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

// Longest prefix wins, so a future /jobs/:id still reads "Jobs" rather than
// leaving the header blank the way an exact lookup did.
function resolvePageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const match = Object.keys(PAGE_TITLES)
    .filter((route) => route !== "/" && pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match ? PAGE_TITLES[match] : "Einherji";
}

export default function Header({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [isResending, setIsResending] = useState(false);

  // next-themes reads the stored preference in the browser, so the server has no
  // idea which icon belongs here until hydration.
  const isHydrated = useIsHydrated();
  const isDark = resolvedTheme === "dark";
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
      <header className="h-14 border-b border-sky-100/80 dark:border-sky-900/40 bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#38bdf8] shrink-0" />
          <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">{resolvePageTitle(pathname)}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="rounded-lg text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-400 border border-transparent hover:border-sky-200/60 dark:hover:border-sky-800/60 transition-colors"
            // Icon-only, so without this a screen reader announces "button" and
            // nothing else.
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isHydrated && isDark ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Email verification banner */}
      {isUnverified && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
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
