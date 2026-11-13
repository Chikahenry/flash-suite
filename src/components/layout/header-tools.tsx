"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { NotificationsMenu } from "./notifications-menu";

/** Figma Dashboard header, right side: search field, bell, and the staff initials. */
export function HeaderTools({ initials }: { initials: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <div className="flex items-center gap-3">
      <form onSubmit={onSubmit} role="search" className="relative w-[240px]">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-900" />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by account number, username or name" placeholder="Search" className="h-10 w-full rounded-lg bg-surface pl-10 pr-3 text-sm placeholder:text-ink-500 focus:bg-white focus:outline-2 focus:outline-brand-600" />
      </form>
      <NotificationsMenu />
      <span aria-hidden className="grid size-10 place-items-center rounded-full bg-surface text-sm font-semibold text-ink-900">{initials}</span>
    </div>
  );
}
