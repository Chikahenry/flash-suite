"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReadOnlyField } from "@/components/ui/form";
import { Card, DefinitionGrid, EmptyState, PageHeader, SourceStamp, Tabs } from "@/components/ui/layout";
import { AccountsTab } from "@/components/corporate/accounts-tab";
import { OrgAmendForm } from "@/components/corporate/org-amend-form";
import { UsersTab } from "@/components/corporate/users-tab";
import { WorkflowTab } from "@/components/corporate/workflow-tab";
import { RaiseRequestModal, type RaiseRequestConfig } from "@/components/requests/raise-request-modal";
import { RequestTable } from "@/components/requests/request-bits";
import { getOrganization, listRequests } from "@/lib/api";
import { formatDateTime, orgStatusTone } from "@/lib/format";
import type { Organization } from "@/lib/types";
import { SourceBanner } from "@/components/ui/source-banner";

type Tab = "overview" | "users" | "accounts" | "workflow" | "requests";

/** What deactivation touches, shown to maker and checker before approval (BRD UAM-051). */
function ImpactSummary({ org }: { org: Organization }) {
  const rows = [
    ["Users who lose access to this organisation", org.users.length],
    ["Account links removed", org.accounts.filter((a) => a.linked).length],
    ["Groups and policy bands retired", org.groups.length + org.policies.length],
    ["Pending transactions that will be held", org.pendingTransactions],
  ] as const;
  return (
    <ul className="rounded-lg border border-line text-[13px]">
      {rows.map(([label, n]) => (
        <li key={label} className="flex justify-between border-b border-line px-3 py-2 last:border-b-0">
          <span className="text-ink-700">{label}</span>
          <span className="font-semibold tabular text-ink-900">{n}</span>
        </li>
      ))}
    </ul>
  );
}

// One organisation: GET /organizations/{id} and its users, accounts, groups, policies and requests.
// The selected organisation stays in context for every action, so staff never search twice.
export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const org = getOrganization(id);
  const [tab, setTab] = useState<Tab>("overview");
  const [raising, setRaising] = useState<RaiseRequestConfig | null>(null);

  if (!org) {
    return <EmptyState title="Organisation not found" body={`No organisation has the ID ${id}.`} action={<Link href="/corporate" className="text-sm font-medium text-brand-700">Back to Corporate & SME</Link>} />;
  }

  const requests = listRequests().filter((r) => r.targetId === org.id);
  const deactivated = org.status === "Deactivated";

  return (
    <>
      <PageHeader
        back={<Link href="/corporate" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Corporate & SME</Link>}
        title={org.name}
        description={`${org.id} · CIF ${org.cif} · ${org.segment}`}
        actions={
          <>
            <Badge tone={orgStatusTone[org.status]}>{org.status}</Badge>
            {!deactivated && (
              <>
                <Button variant="secondary" onClick={() => setRaising({ action: "Amend organisation", target: org.name, evidence: ["Customer instruction"], body: <OrgAmendForm org={org} /> })}>Amend</Button>
                <Button
                  variant="danger-soft"
                  onClick={() =>
                    setRaising({
                      action: "Deactivate organisation",
                      target: org.name,
                      danger: true,
                      evidence: ["Customer instruction", "Board Resolution"],
                      warning: "Core customer and account records, transaction history and audit records are kept.",
                      body: <ImpactSummary org={org} />,
                    })
                  }
                >
                  Deactivate
                </Button>
                <Button
                  variant="danger-soft"
                  onClick={() =>
                    setRaising({
                      action: "Delete organisation",
                      target: org.name,
                      danger: true,
                      evidence: ["Customer instruction", "Board Resolution"],
                      warning: "The digital organisation record is removed but stays traceable for audit. Core customer and account records and transaction history are kept.",
                      confirmText: "I have reviewed the users, workflows and account links this removes.",
                      body: <ImpactSummary org={org} />,
                    })
                  }
                >
                  Delete
                </Button>
              </>
            )}
          </>
        }
      />

      <SourceBanner source="Corporate/SME platform" affects="Organisation details" />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "users", label: "Users", count: org.users.length },
          { id: "accounts", label: "Accounts", count: org.accounts.length },
          { id: "workflow", label: "Workflow", count: org.policies.length },
          { id: "requests", label: "Requests", count: requests.length },
        ]}
      />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card title="Organisation" actions={<SourceStamp source="Corporate platform" at={org.lastUpdated} />}>
            <DefinitionGrid>
              <ReadOnlyField label="Organisation name" value={org.name} source="Finacle" />
              <ReadOnlyField label="CIF" value={org.cif} source="Finacle" />
              <ReadOnlyField label="Organisation ID" value={org.id} />
              <ReadOnlyField label="Segment" value={org.segment} />
              <ReadOnlyField label="Domicile branch" value={org.branch} source="Finacle" />
              <ReadOnlyField label="Set up on" value={formatDateTime(org.createdAt)} />
            </DefinitionGrid>
          </Card>
          <Card title="At a glance">
            <ul className="flex flex-col gap-3 text-[13px]">
              {[
                ["Users", org.users.length],
                ["Awaiting activation", org.users.filter((u) => u.status === "Pending activation").length],
                ["Locked", org.users.filter((u) => u.status === "Locked").length],
                ["Linked accounts", org.accounts.filter((a) => a.linked).length],
                ["Policy bands", org.policies.length],
                ["Pending transactions", org.pendingTransactions],
              ].map(([label, n]) => (
                <li key={label} className="flex justify-between"><span className="text-ink-700">{label}</span><span className="font-semibold tabular">{n}</span></li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      {tab === "users" && <UsersTab org={org} raise={setRaising} />}
      {tab === "accounts" && <AccountsTab org={org} raise={setRaising} />}
      {tab === "workflow" && <WorkflowTab org={org} raise={setRaising} />}
      {tab === "requests" && <RequestTable rows={requests} empty="No requests have been raised for this organisation." />}

      <RaiseRequestModal config={raising} onClose={() => setRaising(null)} />
    </>
  );
}
