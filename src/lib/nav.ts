import {
  LayoutGrid, Users, ArrowLeftRight, SquareCheckBig, Building2, FileText, History, UserRound,
  CircleUserRound, Settings, Hash, Smartphone, CreditCard, Megaphone, Activity, FileBarChart, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * The first block follows the Figma sidebar: same labels, same order.
 * "New Accounts" from the Figma is left out because the BRD excludes account opening (3.9).
 */
export const figmaNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/requests", label: "Approvals", icon: SquareCheckBig },
  { href: "/cases", label: "Case Management", icon: FileText },
  { href: "/audit-logs", label: "Audit Logs", icon: History },
  { href: "/staff", label: "Users", icon: UserRound },
  { href: "/roles", label: "Roles & Permissions", icon: CircleUserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Modules the BRD requires that have no Figma design yet. They use the same item style. */
export const extraNav: NavItem[] = [
  { href: "/corporate", label: "Corporate & SME", icon: Building2 },
  { href: "/instant-banking", label: "Instant Banking", icon: Hash },
  { href: "/devices", label: "Devices", icon: Smartphone },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/system-status", label: "System Status", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileBarChart },
];

export const allNavItems = [...figmaNav, ...extraNav];
