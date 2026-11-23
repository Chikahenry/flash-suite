"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters and the page number kept in the address bar, so going into a record and back keeps your place.
 * Any change other than the page goes back to page 1. `useSearch` gives a debounced search box.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const get = (key: string) => params.get(key) ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    const t = next.toString();
    router.replace(t ? `${pathname}?${t}` : pathname, { scroll: false });
  };

  const [text, setText] = useState(get("q"));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onSearch = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => set({ q: value.trim() }), 400);
  };

  return { get, set, page, search: { value: text, onChange: onSearch } };
}
