"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { roleBundles } from "@/lib/api";
import { cn } from "@/lib/cn";
import { extraNav, figmaNav, type NavItem } from "@/lib/nav";
import { ROUTE_FUNCTION, usePermissions } from "@/lib/permissions";
import type { StaffSession } from "@/lib/types";
import { Brand } from "./brand";

// Figma sidebar: 280px wide, logo 24px in, items 240x48 with 20px between them,
// 20px icon, 15px medium white label, active item on a translucent white pill.
function Item({ item, active, badge }: { item: NavItem; active: boolean; badge?: number }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-12 items-center gap-3 rounded-lg px-4 text-[15px] font-medium text-white transition-colors",
          active ? "bg-white/15" : "hover:bg-white/8",
        )}
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden />
        <span className="flex-1">{item.label}</span>
        {badge ? <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[11px] font-semibold tabular" aria-label={`${badge} pending`}>{badge}</span> : null}
      </Link>
    </li>
  );
}

export function Sidebar({ pendingApprovals, session }: { pendingApprovals: number; session: StaffSession }) {
  const pathname = usePathname();
  const { can, role, setRole } = usePermissions();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // Menus follow assigned permissions (BRD 4.0 rule 2): an item shows only if the role can view its function.
  const visible = (items: NavItem[]) => items.filter((i) => can(ROUTE_FUNCTION[i.href] ?? null, "View"));
  const main = visible(figmaNav);
  const extra = visible(extraNav);

  return (
    <aside className="flex w-[280px] shrink-0 flex-col text-white">
      <div className="px-6 pb-9 pt-8">
        <Brand />
      </div>
      <nav aria-label="Main" className="scroll-on-dark flex-1 overflow-y-auto px-5 pb-4">
        <ul className="flex flex-col gap-5">
          {main.map((item) => <Item key={item.href} item={item} active={isActive(item.href)} badge={item.href === "/requests" ? pendingApprovals : undefined} />)}
        </ul>
        {extra.length > 0 && (
          <>
            <div className="my-5 border-t border-white/15" />
            <ul className="flex flex-col gap-5">
              {extra.map((item) => <Item key={item.href} item={item} active={isActive(item.href)} />)}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-white/15 px-6 py-3">
        <label className="block text-[11px] text-white/60">
          Preview as role
          <select
            value={role ?? ""}
            onChange={(e) => setRole(e.target.value || null)}
            className="mt-1 h-8 w-full rounded-md border border-white/20 bg-brand-900 px-2 text-xs text-white"
          >
            <option value="">All access (build preview)</option>
            {roleBundles.map((r) => <option key={r.id}>{r.name}</option>)}
          </select>
        </label>
        <div className="mt-3 flex items-center gap-3">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-white/15 text-xs font-semibold">{session.initials}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold">{session.name}</p>
            <p className="truncate text-[11px] text-white/60">{role ?? session.role}</p>
          </div>
          <Link href="/login" onClick={() => sessionStorage.removeItem("bo-session")} aria-label="Sign out" title="Sign out" className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
            <LogOut size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
