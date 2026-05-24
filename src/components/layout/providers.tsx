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
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          // Don't retry UNAUTHORIZED — redirect to login instead
          if ((error as { data?: { code?: string } })?.data?.code === "UNAUTHORIZED") return false;
          return failureCount < 2;
        },
      },
    },
    // Redirect to login on any UNAUTHORIZED tRPC error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(typeof window !== "undefined" && {
      mutationCache: undefined,
    }),
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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
