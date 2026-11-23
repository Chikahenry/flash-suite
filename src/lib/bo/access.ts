"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// Users, roles and permissions: /api/v1/backoffice/staff, /roles, /permissions and /me.

const enc = encodeURIComponent;

export interface RoleSummary { id: string; name: string }
export interface StaffMember {
  id: string; staffId: string; username?: string; email?: string; firstName?: string; lastName?: string; phoneNumber?: string;
  branchSolId?: string; teamName?: string; status?: string; roles?: RoleSummary[]; createdAt?: string; updatedAt?: string;
}
export interface StaffFilterOptions { statuses?: string[]; branches?: string[]; roles?: RoleSummary[] }
export interface Role { id: string; name: string; description?: string; channel?: string; systemRole?: boolean; permissionCount?: number; createdAt?: string; updatedAt?: string }
export interface Permission { id: string; code: string; description?: string; module?: string; resource?: string; action?: string }
export interface RoleUser { id: string; staffId?: string; username?: string; email?: string; firstName?: string; lastName?: string; status?: string }
export interface Me { staff: StaffMember; permissions: string[] }

export const fullName = (s?: { firstName?: string; lastName?: string; username?: string; staffId?: string }) =>
  [s?.firstName, s?.lastName].filter(Boolean).join(" ") || s?.username || s?.staffId || "—";

// ---- staff ----
export interface StaffParams { search?: string; status?: string; role?: string; branch?: string; page: number; size: number }

export const useStaffList = (p: StaffParams) =>
  useQuery({ queryKey: ["staff", "list", p], queryFn: () => api<StaffMember[]>("/staff", { query: { ...p } }), placeholderData: keepPreviousData });

export const useStaffFilterOptions = () =>
  useQuery({ queryKey: ["staff", "filter-options"], queryFn: async () => (await api<StaffFilterOptions>("/staff/filter-options")).data, staleTime: 5 * 60_000 });

/** Looks a person up in the Bank's identity directory by staff ID, to fill a new profile. Only runs when asked. */
export const lookupStaff = async (staffId: string) => (await api<Record<string, unknown>>("/staff/lookup", { query: { staffId } })).data;

function useMutate<V>(keys: string[], run: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k] })) });
}

export interface CreateStaffBody {
  staffId: string; username: string; email: string; firstName: string; lastName: string; phoneNumber?: string;
  branchSolId?: string; teamName?: string; roleIds: string[];
}
export type UpdateStaffBody = Partial<Pick<StaffMember, "email" | "firstName" | "lastName" | "phoneNumber" | "branchSolId" | "teamName">>;

export const useCreateStaff = () => useMutate<CreateStaffBody>(["staff", "roles"], (body) => api("/staff", { method: "POST", body }));
export const useUpdateStaff = () =>
  useMutate<{ staffId: string; profile?: UpdateStaffBody; roleIds?: string[] }>(["staff", "roles"], async ({ staffId, profile, roleIds }) => {
    if (profile && Object.keys(profile).length) await api(`/staff/${enc(staffId)}`, { method: "PATCH", body: profile });
    if (roleIds) await api(`/staff/${enc(staffId)}/roles`, { method: "PUT", body: { roleIds } });
  });
export const useStaffAction = () =>
  useMutate<{ staffId: string; action: "deactivate" | "reactivate" | "unlock" | "reset-password" }>(["staff"], ({ staffId, action }) =>
    api<{ message?: string }>(`/staff/${enc(staffId)}/${action}`, { method: "POST" }));

// ---- roles and permissions ----
export const useRoles = () =>
  useQuery({ queryKey: ["roles", "list"], queryFn: async () => (await api<Role[]>("/roles")).data });
export const usePermissionCatalogue = () =>
  useQuery({ queryKey: ["roles", "catalogue"], queryFn: async () => (await api<Permission[]>("/permissions")).data, staleTime: 10 * 60_000 });
export const useRolePermissions = (roleId: string | null) =>
  useQuery({ queryKey: ["roles", roleId, "permissions"], queryFn: async () => (await api<Permission[]>(`/roles/${enc(roleId ?? "")}/permissions`)).data, enabled: !!roleId });
export const useRoleUsers = (roleId: string | null) =>
  useQuery({ queryKey: ["roles", roleId, "users"], queryFn: async () => (await api<RoleUser[]>(`/roles/${enc(roleId ?? "")}/users`)).data, enabled: !!roleId });

/** Creates or updates a custom role, then replaces its permissions. System roles cannot be changed. */
export const useSaveRole = () =>
  useMutate<{ roleId?: string; name: string; description: string; permissionIds: string[] }>(["roles", "staff"], async ({ roleId, name, description, permissionIds }) => {
    const saved = roleId
      ? (await api<Role>(`/roles/${enc(roleId)}`, { method: "PATCH", body: { name, description } })).data
      : (await api<Role>("/roles", { method: "POST", body: { name, description } })).data;
    await api(`/roles/${enc(saved?.id ?? roleId ?? "")}/permissions`, { method: "PUT", body: { permissionIds } });
  });
export const useDeleteRole = () => useMutate<string>(["roles"], (roleId) => api(`/roles/${enc(roleId)}`, { method: "DELETE" }));

// ---- who is signed in ----
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: async () => (await api<Me>("/me")).data, staleTime: 5 * 60_000, retry: false });
