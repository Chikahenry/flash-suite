"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface StaffIdentity {
  /** The email the staff member signed in with. */
  username: string;
  /** A readable name worked out from the email until the back end provides a staff profile. */
  name: string;
  initials: string;
  /** The staff member's user ID, as the audit log records it. */
  userId: string;
  /** From the staff profile (GET /me); empty until it loads. */
  staffId: string;
  roles: string[];
  branch: string;
  team: string;
  permissions: string[];
}

const EMPTY: StaffIdentity = { username: "", name: "", initials: "", userId: "", staffId: "", roles: [], branch: "", team: "", permissions: [] };

/** "backoffice.superadmin@bank.ng" becomes "Backoffice Superadmin" */
export function identityFromEmail(username: string, userId = ""): StaffIdentity {
  const local = username.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  const name = words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const initials = (words[0]?.[0] ?? "") + (words[1]?.[0] ?? words[0]?.[1] ?? "");
  return { ...EMPTY, username, name, initials: initials.toUpperCase(), userId };
}

const Ctx = createContext<StaffIdentity>(EMPTY);

/** Who is signed in, read from the server session. Replace with the staff profile API when it exists. */
export function StaffIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<StaffIdentity>(EMPTY);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (s: { username?: string | null; userId?: string | null } | null) => {
        if (!alive || !s?.username) return;
        const base = identityFromEmail(s.username, s.userId ?? "");
        setIdentity(base);
        // The real profile (name, roles, branch, permissions). If it cannot be read, the name from the email stays.
        const res = await fetch("/api/bo/me", { cache: "no-store", headers: { "x-optional": "1" } });
        const body = (await res.json().catch(() => null)) as { data?: { staff?: Record<string, unknown>; permissions?: string[] } } | null;
        const st = body?.data?.staff;
        if (!alive || !res.ok || !st) return;
        const str = (v: unknown) => (typeof v === "string" ? v : "");
        const name = [str(st.firstName), str(st.lastName)].filter(Boolean).join(" ") || base.name;
        const parts = name.split(/s+/);
        setIdentity({
          ...base,
          name,
          initials: ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base.initials,
          staffId: str(st.staffId),
          roles: Array.isArray(st.roles) ? (st.roles as { name?: string }[]).map((r) => r.name ?? "").filter(Boolean) : [],
          branch: str(st.branchSolId),
          team: str(st.teamName),
          permissions: body?.data?.permissions ?? [],
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return <Ctx.Provider value={identity}>{children}</Ctx.Provider>;
}

export const useStaffIdentity = () => useContext(Ctx);
