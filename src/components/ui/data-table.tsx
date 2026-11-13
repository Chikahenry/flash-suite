"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** Small icon before the column name, as on the Figma Customers and Users tables. */
  icon?: LucideIcon;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

/**
 * Table used by every list screen, styled from the Figma lists: 12px rounded outline,
 * 48px header, 52px rows, 14px text. `grid` adds the column dividers seen on Customers and Users;
 * `selectable` adds the leading checkbox column. Horizontal scroll stays inside the table.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "No records match.",
  grid = false,
  headerFill = false,
  selectable,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  grid?: boolean;
  /** Grey header row, as on the Figma Transactions and Audit Logs tables. */
  headerFill?: boolean;
  footer?: ReactNode;
  selectable?: { selected: string[]; onChange: (keys: string[]) => void };
}) {
  const keys = rows.map(rowKey);
  const allSelected = !!selectable && keys.length > 0 && keys.every((k) => selectable.selected.includes(k));
  const divider = grid ? "border-r border-line last:border-r-0" : "";
  const box = "size-[18px] rounded border-line accent-accent-500";

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className={cn("h-12 text-ink-900", headerFill && "bg-surface")}>
            {selectable && (
              <th scope="col" className={cn("w-12 px-4", divider)}>
                <input type="checkbox" aria-label="Select all rows" className={box} checked={allSelected} onChange={() => selectable.onChange(allSelected ? [] : keys)} />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-4 text-[13px] font-semibold whitespace-nowrap", c.align === "right" && "text-right", divider, c.className)}>
                <span className="inline-flex items-center gap-2">
                  {c.icon && <c.icon size={16} aria-hidden className="text-ink-900" />}
                  {c.header}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="border-t border-line px-4 py-12 text-center text-ink-500">{empty}</td>
            </tr>
          ) : (
            rows.map((row) => {
              const k = rowKey(row);
              return (
                <tr key={k} className="h-[52px] border-t border-line hover:bg-surface/70">
                  {selectable && (
                    <td className={cn("px-4", divider)}>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        className={box}
                        checked={selectable.selected.includes(k)}
                        onChange={() => selectable.onChange(selectable.selected.includes(k) ? selectable.selected.filter((x) => x !== k) : [...selectable.selected, k])}
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-4 py-2 align-middle text-ink-900", c.align === "right" && "text-right tabular", divider, c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
    </div>
  );
}
