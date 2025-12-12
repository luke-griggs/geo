"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Query stale times for different data types (in milliseconds)
 * These should roughly match the server-side cache times
 */
export const QUERY_STALE_TIMES = {
  // Data that changes frequently (visibility, mentions, etc.)
  dynamic: 30 * 1000, // 30 seconds
  // Data that rarely changes (brands, topics, etc.)
  stable: 5 * 60 * 1000, // 5 minutes
  // Real-time data (run status)
  realtime: 0, // Always stale, refetch on mount
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't refetch on window focus by default
            refetchOnWindowFocus: false,
            // Default stale time of 30 seconds (can be overridden per query)
            staleTime: QUERY_STALE_TIMES.dynamic,
            // Keep data in cache for 10 minutes after it's no longer used
            gcTime: 10 * 60 * 1000,
            // Retry once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
