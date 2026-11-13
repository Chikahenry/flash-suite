"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SourceBanner } from "@/components/ui/source-banner";
import {
  ArrowLeft, ArrowLeftRight, CircleX, ExternalLink, FolderOpen, Hash, History, IdCard, KeyRound,
  Link2, MoreHorizontal, ShieldCheck, Smartphone, SquarePen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, Notice, SourceStamp } from "@/components/ui/layout";
import { Modal } from "@/components/ui/modal";
import { FiltersButton, SearchField } from "@/components/ui/toolbar";
import { DeviceList } from "@/components/customers/device-card-lists";
import { InbPanel } from "@/components/customers/inb-panel";
import { CaseTable, TransactionTable } from "@/components/ops/tables";
import { useRaise } from "@/components/requests/use-raise";
import { cases, customers, transactions, type Card as BankCard, type RetailCustomer } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNaira } from "@/lib/format";

type Tab = "transactions" | "activity" | "kyc" | "cases" | "devices" | "inb" | "links";

const TABS: { id: Tab; label: string; icon: typeof History }[] = [
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "activity", label: "Activity Logs", icon: History },
  { id: "kyc", label: "KYC Docs", icon: ShieldCheck },
  { id: "cases", label: "Cases", icon: FolderOpen },
  // Below: BRD functions with no Figma tab yet, in the same style.
  { id: "devices", label: "Devices", icon: Smartphone },
  { id: "inb", label: "Instant Banking", icon: Hash },
  { id: "links", label: "Account Links", icon: Link2 },
];

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1.5 text-sm font-medium text-ink-900">{children}</div>
    </div>
  );
}

function TierChip({ tier }: { tier: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md bg-brand-50 px-2 text-xs font-medium text-brand-800">
      <ShieldCheck size={12} aria-hidden /> {tier}
    </span>
  );
}

const schemeColour: Record<BankCard["scheme"], string> = { Mastercard: "text-[#eb001b]", Visa: "text-[#1a1f71]", Verve: "text-[#00425f]" };

/** Figma "Update Customer Info" modal. The fields are CRM-owned, so they are shown locked (BRD CM-006). */
function UpdateInfoModal({ customer, open, onClose }: { customer: RetailCustomer; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Update Customer Info" footer={<Button block disabled>Update Customer Info</Button>}>
      <div className="flex flex-col gap-4">
        <Notice tone="info">These details are held in CRM. Changes made there reach this profile within a minute; they cannot be edited here.</Notice>
        <Field label="First Name" htmlFor="u-fn"><Input id="u-fn" defaultValue={customer.firstName} disabled /></Field>
        <Field label="Last Name" htmlFor="u-ln"><Input id="u-ln" defaultValue={customer.lastName} disabled /></Field>
        <Field label="LGA" htmlFor="u-lga"><Input id="u-lga" defaultValue={customer.lga} disabled /></Field>
        <Field label="State of Origin" htmlFor="u-state"><Select id="u-state" defaultValue={customer.stateOfOrigin} disabled><option>{customer.stateOfOrigin}</option></Select></Field>
        <Field label="Marital Status" htmlFor="u-ms"><Select id="u-ms" defaultValue={customer.marital} disabled><option>{customer.marital}</option></Select></Field>
        <Field label="DOB" htmlFor="u-dob"><Input id="u-dob" defaultValue={formatDateTime(customer.dob)} disabled /></Field>
      </div>
    </Modal>
  );
}

// Figma "Customer Details": back link, profile header with three actions, two rows of details,
// account cards, payment cards, and a left-hand tab list. GET /customers/{cif} and its sub-resources.
export default function CustomerPage() {
  const { cif } = useParams<{ cif: string }>();
  const customer = customers.find((c) => c.cif === cif);
  const [tab, setTab] = useState<Tab>("transactions");
  const [account, setAccount] = useState<string | null>(null);
  const [cardMenu, setCardMenu] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [caseTab, setCaseTab] = useState<"all" | "active" | "resolved">("all");
  const [q, setQ] = useState("");
  const [linkSel, setLinkSel] = useState<string[]>([]);
  const [raise, modal] = useRaise();
  const [confirmBlock, setConfirmBlock] = useState(false);

  if (!customer) {
    return <EmptyState title="Customer not found" body={`No customer has the CIF ${cif}.`} action={<Link href="/customers" className="text-sm font-medium text-brand-700">Back to customers</Link>} />;
  }

  const name = `${customer.firstName} ${customer.lastName}`;
  const target = `${name} · CIF ${customer.cif}`;
  const selectedAccount = account ?? customer.accounts[0]?.number;
  const enrolled = customer.profile.status !== "Not enrolled";
  const active = customer.profile.status === "Active";
  const txns = transactions.filter((t) => t.cif === customer.cif && (!selectedAccount || t.account === selectedAccount) && t.ref.toLowerCase().includes(q.toLowerCase()));
  const allCases = cases.filter((c) => c.cif === customer.cif);
  const shownCases = allCases.filter((c) => (caseTab === "all" ? true : caseTab === "resolved" ? c.status === "Resolved" : !["Resolved", "Cancelled"].includes(c.status)));
  const toLink = customer.accounts.filter((a) => linkSel.includes(a.number) && !a.linked);
  const toUnlink = customer.accounts.filter((a) => linkSel.includes(a.number) && a.linked);
  const headerBtn = "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium";

  const blockRequest = () => {
    setConfirmBlock(false);
    raise({
      action: active ? "Block Account" : "Unblock Account",
      target,
      evidence: ["Customer instruction", "KYC verification"],
      danger: active,
      warning: active
        ? "Blocking means the customer loses access to their digital profile and cannot perform transactions on the channels. The core bank account is not frozen or closed."
        : "This restores the customer's access to their digital profile.",
    });
  };

  const blockCard = (c: BankCard) => {
    setCardMenu(null);
    raise({
      action: "Permanent card block",
      target: `${c.maskedPan} · ${name}`,
      evidence: ["Customer instruction", "KYC verification"],
      danger: true,
      warning: "Permanent blocking (hotlisting) stops all further use of this card and cannot be reversed in the Back Office. It affects this card only.",
      confirmText: "I understand this block is permanent and cannot be undone here.",
    });
  };

  return (
    <>
      <Link href="/customers" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-900 hover:underline"><ArrowLeft size={18} aria-hidden /> Back to customers</Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-brand-50 text-base font-semibold text-brand-800">{customer.firstName[0]}{customer.lastName[0]}</span>
          <div>
            <p className="text-base font-semibold text-ink-900">{name}</p>
            <div className="mt-1"><TierChip tier={customer.accounts[0]?.tier ?? "Tier 1"} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {enrolled ? (
            <>
              <button type="button" className={cn(headerBtn, "border border-line bg-white text-ink-900 hover:bg-surface")} onClick={() => raise({ action: "Reset password", target, evidence: ["Customer instruction", "KYC verification"], warning: "The customer sets a new password through the secure recovery procedure. Staff never see or set it." })}>
                Password Reset <KeyRound size={16} aria-hidden />
              </button>
              <button type="button" className={cn(headerBtn, "border border-accent-100 bg-accent-50 text-accent-700 hover:bg-accent-100")} onClick={() => setUpdating(true)}>
                Update Customer <SquarePen size={16} aria-hidden />
              </button>
              <button
                type="button"
                className={cn(headerBtn, "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100")}
                onClick={() => (active ? setConfirmBlock(true) : blockRequest())}
              >
                {active ? "Block Account" : "Unblock Account"} <CircleX size={16} aria-hidden />
              </button>
            </>
          ) : (
            <Button onClick={() => raise({ action: "Retail enrolment", target, evidence: ["Customer instruction", "Identification"], body: <Field label="Preferred username" htmlFor="enrol-u" required hint="Checked for availability. Name, email and phone come from CRM."><Input id="enrol-u" /></Field> })}>Enrol for digital banking</Button>
          )}
        </div>
      </div>

      <SourceBanner source="CRM" affects="Customer details" />
      {customer.syncStatus === "Sync failed" && <div className="mb-5"><Notice tone="warning" title="CRM synchronisation failed">The last CRM change did not reach the digital profile. The values below are the last confirmed ones; recovery is queued.</Notice></div>}

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6">
        <Detail label="Account No."><span className="tabular">{customer.accountNo}</span></Detail>
        <Detail label="Phone"><span className="tabular">{customer.phone.replace(/\s/g, "")}</span></Detail>
        <Detail label="Channel">{customer.channelType}</Detail>
        <Detail label="Status"><span className="inline-flex items-center gap-1.5"><span aria-hidden className={cn("size-1.5 rounded-full", active ? "bg-accent-500" : "bg-red-500")} />{enrolled ? customer.profile.status : "Not enrolled"}</span></Detail>
        <Detail label="BVN"><span className="tabular">{customer.bvn}</span></Detail>
        <Detail label="NIN"><span className="tabular">{customer.nin}</span></Detail>
        <Detail label="DOB"><span className="tabular">{customer.dob.split("-").reverse().join("/")}</span></Detail>
        <Detail label="Gender">{customer.gender}</Detail>
        <Detail label="Marital status">{customer.marital}</Detail>
        <Detail label="Nationality">{customer.nationality}</Detail>
        <Detail label="State of Origin">{customer.stateOfOrigin}</Detail>
        <Detail label="LGA">{customer.lga}</Detail>
      </div>
      <p className="mt-3"><SourceStamp source="CRM" at={customer.crmUpdated} stale={customer.syncStatus === "Sync failed"} /></p>

      <div className="mt-6 grid gap-4 border-t border-line pt-6 md:grid-cols-2 xl:grid-cols-4">
        {customer.accounts.map((a) => {
          const on = a.number === selectedAccount;
          return (
            <button key={a.number} type="button" aria-pressed={on} onClick={() => setAccount(a.number)} className={cn("flex flex-col gap-2 rounded-xl border p-4 text-left", on ? "border-dashed border-accent-500 bg-accent-50" : "border-line bg-white hover:bg-surface")}>
              <span className="flex w-full items-center justify-between text-xs text-ink-700">{a.type} Account <TierChip tier={a.tier} /></span>
              <span className="text-sm tabular text-ink-900">{a.number}</span>
              <span className="text-base font-semibold tabular text-ink-900">{formatNaira(a.balance)}</span>
            </button>
          );
        })}
      </div>

      <h2 className="mb-4 mt-7 text-lg font-semibold text-ink-900">Cards</h2>
      {customer.cards.length === 0 ? <p className="text-sm text-ink-500">No card is linked to this customer.</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {customer.cards.map((c) => {
            const blocked = c.status === "Permanently blocked";
            return (
              <div key={c.id} className={cn("relative flex items-center gap-3 rounded-xl border p-4", blocked ? "border-red-200 bg-red-50" : "border-line bg-white")}>
                <span className={cn("grid h-8 w-11 place-items-center rounded-md bg-white text-[10px] font-bold uppercase ring-1 ring-line", schemeColour[c.scheme])}>{c.scheme === "Mastercard" ? "MC" : c.scheme}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">Ending {c.maskedPan.slice(-4)}</p>
                  <p className="text-xs tabular text-ink-500">{c.expiry}{blocked ? " · Blocked" : ""}</p>
                </div>
                <button type="button" aria-label={`Actions for card ending ${c.maskedPan.slice(-4)}`} aria-expanded={cardMenu === c.id} onClick={() => setCardMenu(cardMenu === c.id ? null : c.id)} className="rounded p-1 text-ink-700 hover:bg-surface"><MoreHorizontal size={18} /></button>
                {cardMenu === c.id && (
                  <ul role="menu" className="absolute right-3 top-12 z-10 w-52 rounded-lg border border-line bg-white py-1 shadow-pop">
                    <li role="none">
                      {blocked
                        ? <span className="block px-3 py-2 text-[13px] text-ink-500">Permanently blocked. No further action.</span>
                        : <button role="menuitem" type="button" onClick={() => blockCard(c)} className="block w-full px-3 py-2 text-left text-[13px] text-red-700 hover:bg-surface">Block Card</button>}
                    </li>
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-7 grid gap-6 border-t border-line pt-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Customer sections" className="flex flex-col gap-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)} className={cn("flex h-10 items-center gap-3 rounded-r-lg border-l-2 px-3 text-left text-sm", tab === t.id ? "border-accent-500 bg-surface font-medium text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900")}>
              <t.icon size={16} aria-hidden /> {t.label}
            </button>
          ))}
        </nav>

        <section className="min-w-0 lg:border-l lg:border-line lg:pl-6">
          {tab === "transactions" && (
            <>
              <h3 className="mb-4 text-lg font-semibold">Transactions</h3>
              <div className="mb-4 flex flex-wrap gap-2"><SearchField value={q} onChange={setQ} placeholder="Search by session id" /></div>
              <TransactionTable rows={txns} empty="No digital-channel transaction on the selected account." />
            </>
          )}

          {tab === "activity" && (
            <>
              <h3 className="mb-4 text-lg font-semibold">Activity Logs</h3>
              <div className="mb-4 flex flex-wrap gap-2">
                <SearchField value={q} onChange={setQ} placeholder="Search by session id" />
                <FiltersButton><p className="text-[13px] text-ink-500">No filters are configured for activity logs yet.</p></FiltersButton>
              </div>
              <div className="rounded-xl border border-line">
                {customer.activity.length === 0 ? <p className="px-4 py-8 text-center text-sm text-ink-500">No activity recorded.</p> : (
                  <ul className="divide-y divide-line">
                    {customer.activity.map((a, i) => (
                      <li key={i} className="px-4 py-3.5">
                        <p className="text-sm text-ink-900"><span className="font-medium">{name}</span> <span className="text-ink-500">· {formatDateTime(a.at)}</span></p>
                        <p className="mt-1 text-sm text-accent-700">{a.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {tab === "kyc" && (
            <>
              <h3 className="mb-4 text-lg font-semibold">KYC Docs</h3>
              {customer.documents.length === 0 ? <p className="text-sm text-ink-500">The repository returned no documents for this customer.</p> : (
                <ul className="grid gap-4 md:grid-cols-3">
                  {customer.documents.map((d) => (
                    <li key={d.id}>
                      <p className="mb-2 text-xs text-ink-500">{d.type}</p>
                      <button type="button" className="grid h-40 w-full place-items-center rounded-xl border border-line bg-surface text-ink-400 hover:bg-line" aria-label={`View ${d.type}`}><IdCard size={36} aria-hidden /></button>
                      <div className="mt-2 flex items-center justify-between"><span className="truncate text-xs text-ink-500">{d.name}</span><Badge tone={d.status === "Verified" ? "success" : d.status === "Expired" ? "danger" : "warning"}>{d.status}</Badge></div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs text-ink-500">Shown from the document repository; not stored here. Each view is recorded in the audit log.</p>
            </>
          )}

          {tab === "cases" && (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Cases</h3>
                <Button><ExternalLink size={16} aria-hidden /> Log New Case in CRM</Button>
              </div>
              <div role="tablist" className="mb-4 inline-flex gap-1 rounded-lg bg-surface p-1">
                {(["all", "active", "resolved"] as const).map((t) => {
                  const n = t === "all" ? allCases.length : allCases.filter((c) => (t === "resolved" ? c.status === "Resolved" : !["Resolved", "Cancelled"].includes(c.status))).length;
                  return <button key={t} role="tab" type="button" aria-selected={caseTab === t} onClick={() => setCaseTab(t)} className={cn("h-8 rounded-md px-4 text-[13px] font-medium capitalize", caseTab === t ? "bg-white text-accent-700 shadow-card" : "text-ink-500")}>{t} ({n})</button>;
                })}
              </div>
              <CaseTable rows={shownCases} />
              <p className="mt-3 text-sm text-ink-500">Showing {shownCases.length} of {allCases.length} cases raised by this customer</p>
            </>
          )}

          {tab === "devices" && (<><h3 className="mb-4 text-lg font-semibold">Devices</h3><DeviceList devices={customer.devices} owner={name} raise={raise} /></>)}
          {tab === "inb" && (<><h3 className="mb-4 text-lg font-semibold">Instant Banking</h3><InbPanel customer={customer} raise={raise} /></>)}

          {tab === "links" && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Account Links</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={!enrolled || toUnlink.length === 0} onClick={() => raise({ action: "Unlink accounts", target, evidence: ["Customer instruction"], warning: "Unlinking removes digital access to these accounts only. The core accounts are not changed.", body: <p className="text-sm tabular">{toUnlink.map((a) => a.number).join(", ")}</p> })}>Unlink selected ({toUnlink.length})</Button>
                  <Button disabled={!enrolled || toLink.length === 0} onClick={() => raise({ action: "Link accounts", target, evidence: ["Customer instruction"], body: <p className="text-sm tabular">{toLink.map((a) => a.number).join(", ")}</p> })}>Link selected ({toLink.length})</Button>
                </div>
              </div>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {customer.accounts.map((a) => {
                  const blocked = !a.linked && a.status !== "Active";
                  return (
                    <li key={a.number} className="flex items-center gap-3 px-4 py-3">
                      <input type="checkbox" className="size-[18px] accent-accent-500" aria-label={`Select ${a.number}`} disabled={blocked || !enrolled} checked={linkSel.includes(a.number)} onChange={() => setLinkSel((s) => (s.includes(a.number) ? s.filter((x) => x !== a.number) : [...s, a.number]))} />
                      <span className="flex-1 text-sm"><span className="font-medium tabular">{a.number}</span> <span className="text-ink-500">· {a.type} · {a.tier}{blocked ? ` · ${a.status} in core banking, not eligible` : ""}</span></span>
                      <Badge tone={a.linked ? "info" : "neutral"}>{a.linked ? "Linked" : "Not linked"}</Badge>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      <UpdateInfoModal customer={customer} open={updating} onClose={() => setUpdating(false)} />
      <ConfirmDialog
        open={confirmBlock}
        onClose={() => setConfirmBlock(false)}
        onConfirm={blockRequest}
        question="Are you sure you want to block this customer's account?"
        note="Blocking account means the customer will lose access to their account and can't perform transactions."
        confirmLabel="Yes, Block Account"
      />
      {modal}
    </>
  );
}
