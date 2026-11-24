"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, CircleX, FolderOpen, History, KeyRound, MoreHorizontal, ShieldCheck, SquarePen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActionDialog, ReasonDialog } from "@/components/ui/action-dialog";
import { Field, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/layout";
import { ErrorState, Skeleton } from "@/components/ui/query-state";
import { RefreshButton } from "@/components/ui/refresh-button";
import { ActivityTab, CasesTab, KycTab, TransactionsTab } from "@/components/customers/api-tables";
import { UpdateCustomerModal } from "@/components/customers/update-customer-modal";
import {
  useBlockCard, useCustomer, useCustomerAccounts, useCustomerCards, useResetCredential, useSetAccountRestricted, useSetCustomerBlocked,
} from "@/lib/bo/customers";
import { formatApiDate, formatApiDateTime, formatMoney, humanise, initialsOf, isBlocked, statusTone } from "@/lib/bo/format";
import type { CustomerCard } from "@/lib/bo/types";
import { AutoEnrolPanel } from "@/components/customers/auto-enrol";
import { cn } from "@/lib/cn";
import { useDismiss } from "@/lib/use-dismiss";

type Tab = "transactions" | "activity" | "kyc" | "cases";

const TABS: { id: Tab; label: string; icon: typeof History }[] = [
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "activity", label: "Activity Logs", icon: History },
  { id: "kyc", label: "KYC Docs", icon: ShieldCheck },
  { id: "cases", label: "Cases", icon: FolderOpen },
];

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1.5 break-words text-sm font-medium text-ink-900">{children}</div>
    </div>
  );
}

function TierChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md bg-brand-50 px-2 text-xs font-medium text-brand-800">
      <ShieldCheck size={12} aria-hidden /> {children}
    </span>
  );
}

const dash = (v?: string | null) => (v ? v : "—");
const REASONS = [["LOST", "Lost"], ["STOLEN", "Stolen"], ["OTHERS", "Other"]] as const;

// Figma "Customer Details": profile header with actions, details, accounts, cards and a left-hand tab list.
// The customer ID in the address is the CIF. Every action runs on the Bank's system straight away.
export default function CustomerPage() {
  const { cif } = useParams<{ cif: string }>();
  const customerId = decodeURIComponent(cif);

  const customer = useCustomer(customerId);
  const accounts = useCustomerAccounts(customerId);
  const cards = useCustomerCards(customerId);

  const [tab, setTab] = useState<Tab>("transactions");
  const [account, setAccount] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  useDismiss(menu !== null, () => setMenu(null), menu ?? "");
  const [updating, setUpdating] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [resetting, setResetting] = useState<"password" | "pin" | null>(null);
  const [cardToBlock, setCardToBlock] = useState<CustomerCard | null>(null);
  const [cardReason, setCardReason] = useState<"LOST" | "STOLEN" | "OTHERS">("LOST");
  const [accountToToggle, setAccountToToggle] = useState<{ number: string; restrict: boolean } | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const setBlocked = useSetCustomerBlocked(customerId);
  const reset = useResetCredential(customerId);
  const blockCard = useBlockCard(customerId);
  const restrict = useSetAccountRestricted(customerId);

  if (customer.isLoading) {
    return <div className="flex flex-col gap-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-14 w-72" /><Skeleton className="h-32" /><Skeleton className="h-28" /></div>;
  }
  if (customer.isError || !customer.data) {
    return (
      <>
        <Link href="/customers" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-900 hover:underline"><ArrowLeft size={18} aria-hidden /> Back to customers</Link>
        <ErrorState error={customer.error} onRetry={() => void customer.refetch()} title="This customer could not be loaded" />
      </>
    );
  }

  const c = customer.data;
  const name = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ") || c.customerId;
  const blocked = isBlocked(c.retailStatus);
  const accountList = accounts.data ?? [];
  const selectedAccount = account ?? accountList.find((a) => a.defaultAccount)?.accountNumber ?? accountList[0]?.accountNumber;
  const headerBtn = "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium";

  return (
    <>
      <Link href="/customers" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-900 hover:underline"><ArrowLeft size={18} aria-hidden /> Back to customers</Link>

      {done && <div className="mb-4"><Notice tone="success" title="Done">{done}</Notice></div>}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-brand-50 text-base font-semibold text-brand-800">{initialsOf(name)}</span>
          <div>
            <p className="text-base font-semibold text-ink-900">{name}</p>
            <div className="mt-1 flex items-center gap-2">
              {c.kycTier !== undefined && <TierChip>Tier {c.kycTier}</TierChip>}
              <Badge tone={statusTone(c.retailStatus)}>{humanise(c.retailStatus)}</Badge>
            </div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <RefreshButton />
          <button type="button" className={cn(headerBtn, "border border-line bg-white text-ink-900 hover:bg-surface")} onClick={() => setResetting("password")}>
            Password Reset <KeyRound size={16} aria-hidden />
          </button>
          <button type="button" className={cn(headerBtn, "border border-accent-100 bg-accent-50 text-accent-700 hover:bg-accent-100")} onClick={() => setUpdating(true)}>
            Update Customer <SquarePen size={16} aria-hidden />
          </button>
          <button type="button" className={cn(headerBtn, blocked ? "border border-accent-100 bg-accent-50 text-accent-700 hover:bg-accent-100" : "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100")} onClick={() => setBlocking(true)}>
            {blocked ? "Unblock Account" : "Block Account"} <CircleX size={16} aria-hidden />
          </button>
          <div className="relative" data-dismiss="header">
            <button type="button" aria-label="More actions" aria-expanded={menu === "header"} onClick={() => setMenu(menu === "header" ? null : "header")} className="grid size-10 place-items-center rounded-lg border border-line bg-white text-ink-700 hover:bg-surface"><MoreHorizontal size={18} /></button>
            {menu === "header" && (
              <ul role="menu" className="absolute right-0 top-12 z-10 w-48 rounded-lg border border-line bg-white py-1 shadow-pop">
                <li role="none"><button role="menuitem" type="button" onClick={() => { setMenu(null); setResetting("pin"); }} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-surface">PIN Reset</button></li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6">
        <Detail label="Customer ID (CIF)"><span className="tabular">{c.customerId}</span></Detail>
        <Detail label="Phone"><span className="tabular">{dash(c.phone)}</span></Detail>
        <Detail label="Email">{dash(c.email)}</Detail>
        <Detail label="KYC">{humanise(c.kycStatus)}</Detail>
        <Detail label="Retail status">{humanise(c.retailStatus)}</Detail>
        <Detail label="Corporate status">{humanise(c.corporateStatus)}</Detail>
        <Detail label="USSD status">{humanise(c.ussdStatus)}</Detail>
        {c.maskedBvn && <Detail label="BVN"><span className="tabular">{dash(c.maskedBvn)}</span></Detail>}
        {c.maskedNin && <Detail label="NIN"><span className="tabular">{dash(c.maskedNin)}</span></Detail>}
        {c.dateOfBirth && <Detail label="DOB"><span className="tabular">{formatApiDate(c.dateOfBirth)}</span></Detail>}
        {c.gender && <Detail label="Gender">{humanise(c.gender)}</Detail>}
        {c.maritalStatus && <Detail label="Marital status">{humanise(c.maritalStatus)}</Detail>}
        {c.nationality && <Detail label="Nationality">{dash(c.nationality)}</Detail>}
        {c.stateOfOrigin && <Detail label="State of Origin">{dash(c.stateOfOrigin)}</Detail>}
        {c.lga && <Detail label="LGA">{dash(c.lga)}</Detail>}
        <Detail label="Created">{formatApiDateTime(c.createdAt)}</Detail>
        <Detail label="Last updated">{formatApiDateTime(c.updatedAt)}</Detail>
      </div>

      <AutoEnrolPanel customerId={customerId} onDone={setDone} />

      <div className="mt-6 border-t border-line pt-6">
        {accounts.isError ? (
          <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} title="Accounts could not be loaded" />
        ) : accounts.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        ) : accountList.length === 0 ? (
          <p className="text-sm text-ink-500">No account is linked to this customer.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {accountList.map((a) => {
              const on = a.accountNumber === selectedAccount;
              return (
                <div key={a.accountNumber} className={cn("relative rounded-xl border p-4", on ? "border-dashed border-accent-500 bg-accent-50" : "border-line bg-white hover:bg-surface")}>
                  <button type="button" aria-pressed={on} onClick={() => setAccount(a.accountNumber)} className="flex w-full flex-col gap-2 text-left">
                    <span className="flex w-full items-center justify-between gap-2 text-xs text-ink-700">
                      <span className="truncate">{a.accountName || a.schemeCode || "Account"}</span>
                      {a.accountTier && <TierChip>{a.accountTier}</TierChip>}
                    </span>
                    <span className="text-sm tabular text-ink-900">{a.accountNumber}</span>
                    <span className="text-base font-semibold tabular text-ink-900">{a.balanceAvailable === false || a.availableBalance === undefined ? "Balance unavailable" : formatMoney(a.availableBalance, a.currency ?? "NGN")}</span>
                  </button>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {a.defaultAccount && <Badge tone="info">Default</Badge>}
                    {a.status && <Badge tone={statusTone(a.status)}>{humanise(a.status)}</Badge>}
                    {a.digitalChannelBlocked && <Badge tone="danger">Digital blocked</Badge>}
                    <button type="button" onClick={() => setAccountToToggle({ number: a.accountNumber, restrict: !a.digitalChannelBlocked })} className="ml-auto text-xs font-medium text-brand-700 hover:underline">
                      {a.digitalChannelBlocked ? "Allow digital" : "Restrict digital"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <h2 className="mb-4 mt-7 text-lg font-semibold text-ink-900">Cards</h2>
      {cards.isError ? (
        <ErrorState error={cards.error} onRetry={() => void cards.refetch()} title="Cards could not be loaded" />
      ) : cards.isLoading ? (
        <Skeleton className="h-16" />
      ) : (cards.data ?? []).length === 0 ? (
        <p className="text-sm text-ink-500">No card is linked to this customer.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(cards.data ?? []).map((card) => {
            const cardBlocked = isBlocked(card.status) || /LOST|STOLEN|HOTLIST/i.test(card.status ?? "");
            const last4 = (card.maskedPan ?? "").slice(-4);
            return (
              <div key={card.cardId} data-dismiss={card.cardId} className={cn("relative flex items-center gap-3 rounded-xl border p-4", cardBlocked ? "border-red-200 bg-red-50" : "border-line bg-white")}>
                <span className="grid h-8 w-11 place-items-center rounded-md bg-white text-[10px] font-bold uppercase ring-1 ring-line">{(card.scheme ?? "CARD").slice(0, 4)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900">Ending {last4 || "····"}</p>
                  <p className="text-xs tabular text-ink-500">{card.expiryMonth && card.expiryYear ? `${card.expiryMonth}/${card.expiryYear}` : "—"} · {humanise(card.status)}</p>
                </div>
                <button type="button" aria-label={`Actions for card ending ${last4}`} aria-expanded={menu === card.cardId} onClick={() => setMenu(menu === card.cardId ? null : card.cardId)} className="rounded p-1 text-ink-700 hover:bg-surface"><MoreHorizontal size={18} /></button>
                {menu === card.cardId && (
                  <ul role="menu" className="absolute right-3 top-12 z-10 w-52 rounded-lg border border-line bg-white py-1 shadow-pop">
                    <li role="none">
                      {cardBlocked
                        ? <span className="block px-3 py-2 text-[13px] text-ink-500">Already blocked. No further action.</span>
                        : <button role="menuitem" type="button" onClick={() => { setMenu(null); setCardReason("LOST"); setCardToBlock(card); }} className="block w-full px-3 py-2 text-left text-[13px] text-red-700 hover:bg-surface">Block Card</button>}
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
          <h3 className="mb-4 text-lg font-semibold">{TABS.find((t) => t.id === tab)?.label}</h3>
          {tab === "transactions" && <TransactionsTab customerId={customerId} account={selectedAccount} />}
          {tab === "activity" && <ActivityTab customerId={customerId} />}
          {tab === "kyc" && <KycTab customerId={customerId} />}
          {tab === "cases" && <CasesTab customerId={customerId} account={selectedAccount} />}
        </section>
      </div>

      {updating && <UpdateCustomerModal customer={c} onClose={() => setUpdating(false)} onSaved={setDone} />}

      <ReasonDialog
        open={blocking}
        onClose={() => setBlocking(false)}
        danger={!blocked}
        title={blocked ? "Unblock this customer?" : "Block this customer?"}
        description={blocked ? "This restores the customer's access to their digital profile." : "The customer will lose access to their digital profile and cannot transact on the channels. The core bank account is not frozen."}
        confirmLabel={blocked ? "Yes, Unblock" : "Yes, Block Account"}
        onConfirm={async (reason) => {
          await setBlocked.mutateAsync({ block: !blocked, version: c.version ?? 0, reason });
          setDone(blocked ? "Customer unblocked." : "Customer blocked.");
        }}
      />

      <ActionDialog
        open={resetting !== null}
        onClose={() => setResetting(null)}
        title={resetting === "pin" ? "Reset this customer's PIN?" : "Reset this customer's password?"}
        description="The customer receives a secure link or code to set a new one. Staff never see or set it."
        confirmLabel="Yes, Reset"
        onConfirm={async () => {
          const r = await reset.mutateAsync(resetting ?? "password");
          const dest = r.challenge?.maskedDestination;
          setDone(`${resetting === "pin" ? "PIN" : "Password"} reset started${dest ? `. Instructions were sent to ${dest}` : ""}.`);
        }}
      />

      <ActionDialog
        open={cardToBlock !== null}
        onClose={() => setCardToBlock(null)}
        danger
        title="Block this card?"
        description="Blocking stops all further use of this card and may not be reversible from the Back Office. It affects this card only."
        confirmLabel="Yes, Block Card"
        onConfirm={async () => {
          if (!cardToBlock) return;
          await blockCard.mutateAsync({ cardId: cardToBlock.cardId, reason: cardReason });
          setDone(`Card ending ${(cardToBlock.maskedPan ?? "").slice(-4)} blocked.`);
        }}
      >
        <Field label="Reason" htmlFor="card-reason">
          <Select id="card-reason" value={cardReason} onChange={(e) => setCardReason(e.target.value as typeof cardReason)}>
            {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
      </ActionDialog>

      <ActionDialog
        open={accountToToggle !== null}
        onClose={() => setAccountToToggle(null)}
        danger={accountToToggle?.restrict}
        title={accountToToggle?.restrict ? "Restrict digital access?" : "Allow digital access?"}
        description={accountToToggle ? `Account ${accountToToggle.number}. The core account itself is not changed.` : undefined}
        confirmLabel={accountToToggle?.restrict ? "Yes, Restrict" : "Yes, Allow"}
        onConfirm={async () => {
          if (!accountToToggle) return;
          await restrict.mutateAsync({ accountNumber: accountToToggle.number, restrict: accountToToggle.restrict });
          setDone(accountToToggle.restrict ? "Digital access restricted on the account." : "Digital access restored on the account.");
        }}
      />
    </>
  );
}
