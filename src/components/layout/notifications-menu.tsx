"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notifications as seed } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

/** Staff alerts (GET /notifications). Each one opens its request directly (BRD 16.5 rule 13). */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(seed);
  const unread = items.filter((n) => !n.read).length;

  // Pages stay mounted when hidden, so close the panel when this one is hidden.
  useLayoutEffect(() => () => setOpen(false), []);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-10 place-items-center rounded-full bg-surface text-ink-900 hover:bg-line"
      >
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-red-600 text-[10px] font-semibold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-96 rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button type="button" className="text-xs font-medium text-brand-700 disabled:text-ink-400" disabled={unread === 0} onClick={() => setItems((l) => l.map((n) => ({ ...n, read: true })))}>
              Mark all as read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id} className="border-b border-line last:border-b-0">
                <Link
                  href={n.href}
                  onClick={() => { setOpen(false); setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x))); }}
                  className={cn("block px-4 py-3 hover:bg-surface", !n.read && "bg-brand-50/60")}
                >
                  <p className={cn("text-[13px] text-ink-900", !n.read && "font-medium")}>{n.text}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-ink-500">
                    {formatDateTime(n.at)}
                    {n.delivery === "Failed" && <Badge tone="warning">Email delivery failed</Badge>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
