"use client";

import { useState } from "react";
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onOpenSidebar={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
