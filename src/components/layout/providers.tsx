"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { trpc } from "@/lib/trpc-client";
import { clientEnv } from "@/lib/env";

export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 20 minutes — no refetch until then
        staleTime: 20 * 60 * 1000,
        // Never auto-refetch just because the window regained focus
        refetchOnWindowFocus: false,
        // Don't poll in the background when the tab is hidden
        refetchIntervalInBackground: false,
        retry: (failureCount, error) => {
          // Don't retry UNAUTHORIZED — redirect to login instead
          if ((error as { data?: { code?: string } })?.data?.code === "UNAUTHORIZED") return false;
          return failureCount < 2;
        },
      },
    },
  }));

  useState(() => {
    queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        event.query.state.status === "error" &&
        (event.query.state.error as { data?: { code?: string } })?.data?.code === "UNAUTHORIZED"
      ) {
        router.push("/login");
      }
    });
  });

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${clientEnv.NEXT_PUBLIC_APP_URL}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {/* Follows the OS until the user picks a side, then remembers the pick.
            It was hard-wired to dark, so someone on a light desktop got a dark
            app with no hint that the toggle in the header would fix it.
            disableTransitionOnChange stops every coloured surface animating at
            once on the switch, which reads as a glitch rather than a fade. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" closeButton />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
