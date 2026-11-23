"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/bo/client";
import { StaffIdentityProvider } from "@/lib/staff-session";

/** Client-side data cache and the signed-in identity, shared by every screen. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Do not hammer the Bank on errors that retrying cannot fix.
            retry: (count, error) => !(error instanceof ApiError && [400, 401, 403, 404, 409].includes(error.status)) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <StaffIdentityProvider>{children}</StaffIdentityProvider>
    </QueryClientProvider>
  );
}
