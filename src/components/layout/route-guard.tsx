"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { functionForPath, usePermissions } from "@/lib/permissions";

/** Blocks a screen the current role cannot view, including when its address is typed directly (BRD 15.4 item 1). */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { can, role } = usePermissions();
  const fn = functionForPath(pathname);
  if (can(fn, "View")) return <>{children}</>;
  return (
    <div role="alert" className="mx-auto mt-20 flex max-w-md flex-col items-center gap-3 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-600"><ShieldAlert size={22} aria-hidden /></span>
      <h1 className="text-xl font-semibold text-ink-900">You do not have access to this screen</h1>
      <p className="text-sm text-ink-500">The role <span className="font-medium text-ink-900">{role}</span> does not include {fn}. This attempt is recorded. Ask IAM if you need access.</p>
      <Link href="/dashboard" className="mt-2 inline-flex h-10 items-center rounded-lg bg-accent-500 px-5 text-sm font-medium text-white hover:bg-accent-600">Go to the dashboard</Link>
    </div>
  );
}
