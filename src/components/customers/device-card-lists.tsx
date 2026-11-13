"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import type { RaiseRequestConfig } from "@/components/requests/raise-request-modal";
import type { Card as BankCard, Device } from "@/lib/api";
import { formatDateTime, maskAccount } from "@/lib/format";

type Raise = (c: RaiseRequestConfig) => void;

/** Registered devices for one customer (BRD DCA-001..008). GET /customers/{cif}/devices. */
export function DeviceList({ devices, owner, raise }: { devices: (Device & { owner?: string })[]; owner?: string; raise: Raise }) {
  const columns: Column<Device & { owner?: string }>[] = [
    { key: "device", header: "Device", cell: (d) => (<div><p className="font-medium">{d.type}</p><p className="text-xs tabular text-ink-500">ID {d.maskedId}</p></div>) },
    ...(owner ? [] : [{ key: "owner", header: "Customer", cell: (d: Device & { owner?: string }) => d.owner ?? "" }]),
    { key: "channel", header: "Channel", cell: (d) => d.channel },
    { key: "registered", header: "Registered", cell: (d) => <span className="tabular">{formatDateTime(d.registered)}</span> },
    { key: "active", header: "Last activity", cell: (d) => <span className="tabular">{formatDateTime(d.lastActive)}</span> },
    { key: "risk", header: "Risk indicator", cell: (d) => <Badge tone={d.risk === "Flagged" ? "warning" : "neutral"}>{d.risk}</Badge> },
    { key: "status", header: "Status", cell: (d) => <Badge tone={d.status === "Registered" ? "success" : "neutral"}>{d.status}</Badge> },
    {
      key: "act", header: "", align: "right",
      cell: (d) =>
        d.status === "Registered" ? (
          <Button
            variant="danger-soft"
            size="sm"
            onClick={() =>
              raise({
                action: "Deregister device",
                target: `${d.type} (${d.maskedId}) · ${owner ?? d.owner}`,
                evidence: ["Customer instruction", "KYC verification"],
                danger: true,
                warning: "This removes the device's access, ends its sessions and invalidates credentials bound to it. Other devices, the password and the token assignment are not affected. The customer registers a replacement device in the app.",
              })
            }
          >
            Deregister
          </Button>
        ) : null,
    },
  ];
  return <DataTable columns={columns} rows={devices} rowKey={(d) => d.id} empty="No registered device." />;
}

/** Cards for one customer or account (BRD 12). Only permanent block is offered; there is no unblock. */
export function CardList({ cards, owner, raise }: { cards: (BankCard & { owner?: string })[]; owner?: string; raise: Raise }) {
  const columns: Column<BankCard & { owner?: string }>[] = [
    { key: "card", header: "Card", cell: (c) => (<div><p className="font-medium tabular">{c.maskedPan}</p><p className="text-xs text-ink-500">{c.scheme} · Expires {c.expiry}</p></div>) },
    ...(owner ? [] : [{ key: "owner", header: "Customer", cell: (c: BankCard & { owner?: string }) => c.owner ?? "" }]),
    { key: "account", header: "Linked account", cell: (c) => <span className="tabular">{maskAccount(c.account)}</span> },
    { key: "status", header: "Status", cell: (c) => <Badge tone={c.status === "Active" ? "success" : c.status === "Expired" ? "neutral" : "danger"}>{c.status}</Badge> },
    {
      key: "act", header: "", align: "right",
      cell: (c) =>
        c.status === "Active" ? (
          <Button
            variant="danger-soft"
            size="sm"
            onClick={() =>
              raise({
                action: "Permanent card block",
                target: `${c.maskedPan} · ${owner ?? c.owner}`,
                evidence: ["Customer instruction", "KYC verification"],
                danger: true,
                warning: "Permanent blocking (hotlisting) stops all further use of this card and cannot be reversed in the Back Office. It affects this card only, not the account or other cards.",
                confirmText: "I understand this block is permanent and cannot be undone here.",
              })
            }
          >
            Block permanently
          </Button>
        ) : c.status === "Permanently blocked" ? (
          <span className="text-xs text-ink-500">No further action</span>
        ) : null,
    },
  ];
  return <DataTable columns={columns} rows={cards} rowKey={(c) => c.id} empty="No card found." />;
}
