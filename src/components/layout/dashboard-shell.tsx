"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";

/**
 * Frame around every signed-in page.
 *
 * It's a client component because the sidebar's open state has to be shared with
 * the header's menu button, and `layout.tsx` stays a server shell.
 *
 * The `mx-auto max-w-7xl` on the content is the part that matters on a large
 * monitor: without it each page set its own width independently, so Settings sat
 * pinned to the left of a very wide empty area while tables stretched edge to
 * edge. One container means every page lines up.
 */
export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Escape closes the drawer. Expected of anything overlaying the page, and the
  // only way out for a keyboard user other than finding the small × by tabbing
  // through every nav link.
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  // Following a link closes it. The nav links call onClose themselves, but a
  // redirect — the auth guard bouncing you, a mutation navigating — does not.
  //
  // Adjusted during render rather than in an effect: this is state derived from
  // a changed input, and React handles that by re-rendering immediately with the
  // new value instead of painting the stale one first.
  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setIsSidebarOpen(false);
  }

  // The drawer is fixed and scrolls with the body behind it otherwise, which on
  // a phone means flicking the menu scrolls the page underneath.
  useEffect(() => {
    if (!isSidebarOpen) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isSidebarOpen]);

  return (
    // h-dvh, not h-screen: on mobile Safari and Chrome, 100vh is the viewport
    // *without* the browser chrome, so the last row of every page sat under the
    // address bar and the main scroller was permanently a bar-height too tall.
    <div className="relative flex h-dvh overflow-hidden bg-background text-foreground">
      {/* Glacial drafting grid and ambient arctic aurora glow */}
      <div className="console-grid pointer-events-none fixed inset-0 opacity-45 dark:opacity-25 z-0" aria-hidden />
      <div
        className="animate-ice-aurora pointer-events-none fixed -top-32 -right-32 h-[540px] w-[540px] rounded-full bg-gradient-to-br from-sky-400/12 via-cyan-300/8 to-transparent blur-3xl dark:from-sky-500/15 dark:via-cyan-400/8 z-0"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -bottom-24 left-1/3 h-[450px] w-[450px] rounded-full bg-gradient-to-tl from-blue-400/8 via-sky-200/10 to-transparent blur-3xl dark:from-blue-600/10 dark:via-sky-400/5 z-0"
        aria-hidden
      />

      {/* Keyboard and screen-reader users land here first; it lets them past a
          nav that is otherwise eight links to tab through on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground shadow-[0_0_12px_rgba(14,165,233,0.3)]"
      >
        Skip to content
      </a>

      <div className="relative z-10 flex h-full w-full overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
