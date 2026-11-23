import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { RouteGuard } from "@/components/layout/route-guard";
import { SessionGuard } from "@/components/layout/session-guard";
import { Sidebar } from "@/components/layout/sidebar";
import { getSummary } from "@/lib/api";
import { PermissionsProvider } from "@/lib/permissions";

// Figma shell: the whole frame is navy. The sidebar sits directly on it and the page is a
// white panel with rounded corners, inset 8px from the top, right and bottom edges.
export default function AppLayout({ children }: LayoutProps<"/">) {
  const { pending } = getSummary();
  return (
    <Providers>
      <PermissionsProvider>
        <div className="flex h-screen overflow-hidden bg-brand-800">
          <SessionGuard />
          <Suspense fallback={<div className="w-[280px] shrink-0" />}>
            <Sidebar pendingApprovals={pending} />
          </Suspense>
          <main className="scroll-stable my-2 mr-2 min-w-0 flex-1 overflow-y-auto rounded-[20px] bg-white px-8 pb-8 pt-14">
            <Suspense fallback={<p className="text-ink-500">Loading…</p>}>
              <RouteGuard>{children}</RouteGuard>
            </Suspense>
          </main>
        </div>
      </PermissionsProvider>
    </Providers>
  );
}
