"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadOnlyField } from "@/components/ui/form";
import { DefinitionGrid, Notice, SourceStamp } from "@/components/ui/layout";
import type { RaiseRequestConfig } from "@/components/requests/raise-request-modal";
import type { RetailCustomer } from "@/lib/api";

/**
 * Instant Banking/USSD profile (BRD UAM-045..047). Locked, Disabled and Blacklisted are three
 * separate states: clearing one never clears another, and none of them touches the core account.
 */
export function InbPanel({ customer, raise }: { customer: RetailCustomer; raise: (c: RaiseRequestConfig) => void }) {
  const { inb } = customer;
  const who = `${customer.firstName} ${customer.lastName} · INB ${inb.phone}`;
  if (!inb.enrolled) return <Notice tone="info">This customer has no Instant Banking profile.</Notice>;

  const act = (action: string, warning?: string) => raise({ action, target: who, evidence: ["Customer instruction", "KYC verification"], warning });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end"><SourceStamp source="Instant Banking platform" at={inb.updated} /></div>
      <DefinitionGrid cols={4}>
        <ReadOnlyField label="Registered phone" value={<span className="tabular">{inb.phone}</span>} />
        <ReadOnlyField label="Lock state" value={<Badge tone={inb.status === "Locked" ? "danger" : "success"}>{inb.status === "Locked" ? "Locked" : "Not locked"}</Badge>} />
        <ReadOnlyField label="Enabled state" value={<Badge tone={inb.status === "Disabled" ? "danger" : "success"}>{inb.status === "Disabled" ? "Disabled" : "Enabled"}</Badge>} />
        <ReadOnlyField label="Blacklist" value={<Badge tone={inb.blacklisted ? "danger" : "success"}>{inb.blacklisted ? "Blacklisted" : "Not blacklisted"}</Badge>} />
      </DefinitionGrid>

      {inb.status === "Locked" && <Notice tone="info">A locked customer can also use the self-unlock process on USSD.</Notice>}
      {inb.status === "Disabled" && <Notice tone="warning">A disabled profile needs Bank action. The customer cannot re-enable it.</Notice>}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {inb.status === "Locked"
          ? <Button variant="secondary" onClick={() => act("Unlock INB profile")}>Unlock</Button>
          : <Button variant="secondary" onClick={() => act("Lock INB profile")}>Lock</Button>}
        {inb.status === "Disabled"
          ? <Button variant="secondary" onClick={() => act("Enable INB profile")}>Enable</Button>
          : <Button variant="secondary" onClick={() => act("Disable INB profile", "Disabling affects Instant Banking only. Other channels and the core account are unchanged.")}>Disable</Button>}
        {inb.blacklisted
          ? <Button variant="secondary" onClick={() => act("Remove INB blacklist", "This removes the blacklist only. A separate lock or disabled state stays in place.")}>Remove blacklist</Button>
          : <Button variant="danger-soft" onClick={() => act("Blacklist on INB", "Blacklisting stops transactions through Instant Banking only.")}>Blacklist</Button>}
        <Button variant="secondary" onClick={() => act("Reset INB PIN", "The customer sets a new PIN through the approved secure procedure. Staff never see or set the PIN.")}>Reset PIN</Button>
      </div>
    </div>
  );
}
