"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { roleBundles, type PermissionKind } from "./ops-data";

/** Pseudo-function: true for any role that can initiate or approve something. Guards the approval queue. */
export const WORKFLOW = "__workflow";

/** Which permission function guards each route (BRD 6.2.4: access follows assigned permissions). */
export const ROUTE_FUNCTION: Record<string, string> = {
  "/customers": "Retail digital users",
  "/corporate": "Corporate / SME setup",
  "/instant-banking": "Instant Banking",
  "/transactions": "Transactions",
  "/cases": "CRM cases",
  "/devices": "Devices",
  "/cards": "Cards",
  "/campaigns": "Campaigns",
  "/system-status": "System status",
  "/reports": "Reports",
  "/audit-logs": "Audit logs",
  "/staff": "Staff access",
  "/roles": "Staff access",
  "/requests": WORKFLOW,
};

export const functionForPath = (pathname: string): string | null => {
  const key = Object.keys(ROUTE_FUNCTION).find((r) => pathname === r || pathname.startsWith(r + "/"));
  return key ? ROUTE_FUNCTION[key] : null;
};

interface Permissions {
  /** Role bundle being previewed, or null for full access. */
  role: string | null;
  setRole: (role: string | null) => void;
  can: (fn: string | null, kind: PermissionKind) => boolean;
}

const Ctx = createContext<Permissions>({ role: null, setRole: () => {}, can: () => true });
const KEY = "bo-preview-role";

/**
 * Holds the signed-in user's permissions. In production these come from GET /auth/me and the server
 * enforces them on every call (BRD NFR003); hiding a menu here is only the visible half.
 * Until the API exists, "Preview as role" in the sidebar switches between the configured role bundles.
 */
const EVENT = "bo-role-change";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const read = () => {
  const saved = sessionStorage.getItem(KEY);
  return saved && roleBundles.some((r) => r.name === saved) ? saved : null;
};

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Reads the previewed role from session storage as an external store, so the server render
  // (which has no storage) and the first client render agree, and the role survives navigation.
  const role = useSyncExternalStore(subscribe, read, () => null);

  const value = useMemo<Permissions>(() => {
    const bundle = roleBundles.find((r) => r.name === role);
    return {
      role,
      setRole: (next) => {
        if (next) sessionStorage.setItem(KEY, next);
        else sessionStorage.removeItem(KEY);
        window.dispatchEvent(new Event(EVENT));
      },
      can: (fn, kind) => {
        if (!bundle || !fn) return true;
        if (fn === WORKFLOW) return Object.values(bundle.permissions).some((k) => k.includes("Initiate") || k.includes("Approve"));
        return (bundle.permissions[fn] ?? []).includes(kind);
      },
    };
  }, [role]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePermissions = () => useContext(Ctx);
