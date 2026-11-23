"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice, PageHeader, Tabs } from "@/components/ui/layout";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Modal } from "@/components/ui/modal";
import { ErrorState } from "@/components/ui/query-state";
import { DateRangeButton, Pager, SearchField, Toolbar } from "@/components/ui/toolbar";
import { formatApiDateTime, formatMoney, humanise, statusTone } from "@/lib/bo/format";
import {
  useCardRequests, useCardStep, useCardTrail, useChangePickupBranch, usePhysicalCards,
  type CardProduced, type CardRequest, type PhysicalCard,
} from "@/lib/bo/modules";
import { useUrlState } from "@/lib/bo/use-url-state";

const SIZE = 20;
type Tab = "requests" | "physical";

const requestColumns = (open: (r: CardRequest) => void): Column<CardRequest>[] => [
  { key: "at", header: "Requested", cell: (r) => <span className="whitespace-nowrap tabular">{formatApiDateTime(r.createdAt)}</span> },
  { key: "acct", header: "Linked account", cell: (r) => <span className="tabular">{r.linkedAccountNumber ?? "—"}</span> },
  { key: "user", header: "User ID", cell: (r) => <span className="break-all">{r.userId ?? "—"}</span> },
  { key: "form", header: "Type", cell: (r) => <span>{humanise(r.formFactor)}{r.cardProductCode && <span className="block text-xs text-ink-500">{r.cardProductCode}</span>}</span> },
  { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge> },
  { key: "action", header: "Action", cell: (r) => <button type="button" onClick={() => open(r)} className="inline-flex h-8 items-center rounded-lg bg-[#f1f2f5] px-3.5 text-[13px] font-medium hover:bg-line">View Details</button> },
];

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><p className="text-xs text-ink-500">{label}</p><p className="mt-1 break-words text-[13px] font-medium">{value || "—"}</p></div>;
}

function RequestModal({ r, onClose }: { r: CardRequest | null; onClose: () => void }) {
  return (
    <Modal open={!!r} onClose={onClose} title="Card request" description={r?.id} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
      {r && (
        <div className="flex flex-col gap-4 pb-2">
          {r.failureReason && <Notice tone="danger" title="Failed">{r.failureReason}</Notice>}
          <div className="grid grid-cols-2 gap-4">
            <Row label="Status" value={<Badge tone={statusTone(r.status)}>{humanise(r.status)}</Badge>} />
            <Row label="Type" value={humanise(r.formFactor)} />
            <Row label="Linked account" value={r.linkedAccountNumber} />
            <Row label="Debit account" value={r.debitAccountNumber} />
            <Row label="Card product" value={r.cardProductCode} />
            <Row label="Nickname" value={r.nickname} />
            <Row label="Delivery" value={humanise(r.deliveryMode)} />
            <Row label="Pickup branch ID" value={r.pickupBranchId} />
            <Row label="Delivery address" value={r.deliveryAddress} />
            <Row label="Platform reference" value={r.platformReference} />
            <Row label="Card charge" value={r.chargeAmount !== undefined ? formatMoney(r.chargeAmount, r.chargeCurrency ?? "NGN") : undefined} />
            <Row label="Delivery charge" value={r.deliveryChargeAmount !== undefined ? formatMoney(r.deliveryChargeAmount, r.chargeCurrency ?? "NGN") : undefined} />
            <Row label="Requested" value={formatApiDateTime(r.createdAt)} />
            <Row label="Updated" value={formatApiDateTime(r.updatedAt)} />
          </div>
        </div>
      )}
    </Modal>
  );
}

type Act = { card: PhysicalCard; kind: "production" | "reject" | "ready" | "collected" | "branch" | "trail" } | null;

/** Pop-ups for the steps a physical card goes through. Each step runs on the Bank's system straight away. */
function CardActions({ act, onClose, onDone }: { act: Act; onClose: () => void; onDone: (m: string) => void }) {
  const step = useCardStep();
  const branch = useChangePickupBranch();
  const trail = useCardTrail(act?.kind === "trail" ? act.card.id : null);
  const [note, setNote] = useState("");
  const [produced, setProduced] = useState<CardProduced>({ maskedPan: "", expiryMonth: "", expiryYear: "", embossedName: "", productionReference: "" });
  const [branchId, setBranchId] = useState("");
  const [seen, setSeen] = useState<Act>(null);
  if (seen !== act) { setSeen(act); setNote(""); setBranchId(""); setProduced({ maskedPan: "", expiryMonth: "", expiryYear: "", embossedName: "", productionReference: "" }); }
  if (!act) return null;
  const { card, kind } = act;
  const last4 = (card.maskedPan ?? card.id).slice(-4);
  const close = () => { onClose(); };

  if (kind === "trail") {
    return (
      <Modal open onClose={close} title="Card history" description={card.id} footer={<Button variant="secondary" onClick={close}>Close</Button>}>
        {trail.isLoading ? <p className="text-sm text-ink-500">Loading…</p> : trail.isError ? <ErrorState error={trail.error} onRetry={() => void trail.refetch()} /> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {(trail.data ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-500">No movement recorded yet.</li>}
            {(trail.data ?? []).map((e, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <p><span className="text-ink-500">{humanise(e.fromStatus)}</span> → <span className="font-medium">{humanise(e.toStatus)}</span></p>
                <p className="text-xs text-ink-500">{formatApiDateTime(e.occurredAt)} · {e.actorId ?? "system"}</p>
                {e.note && <p className="mt-1 text-[13px]">{e.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    );
  }

  if (kind === "branch") {
    const id = Number(branchId);
    return (
      <ActionDialog open onClose={close} title="Change pickup branch" confirmLabel="Change branch" disabled={!Number.isInteger(id) || id <= 0}
        onConfirm={async () => { await branch.mutateAsync({ cardId: card.id, pickupBranchId: id }); onDone("Pickup branch changed."); }}>
        <Field label="New pickup branch ID" htmlFor="pb" required hint={`Currently ${card.pickupBranchId ?? "not set"}.`}><Input id="pb" inputMode="numeric" value={branchId} onChange={(e) => setBranchId(e.target.value.replace(/\D/g, ""))} /></Field>
      </ActionDialog>
    );
  }

  if (kind === "ready") {
    const p = produced;
    const set = (k: keyof CardProduced) => (e: { target: { value: string } }) => setProduced((v) => ({ ...v, [k]: e.target.value }));
    const ok = p.maskedPan && p.expiryMonth && p.expiryYear && p.embossedName && p.productionReference;
    return (
      <ActionDialog open onClose={close} title="Card is ready for collection" description="Enter what the card team produced. Only the masked card number is kept." confirmLabel="Mark as ready" disabled={!ok}
        onConfirm={async () => { await step.mutateAsync({ cardId: card.id, step: "ready", body: { ...p, ...(note.trim() ? { note: note.trim() } : {}) } }); onDone(`Card ending ${last4} marked ready for collection.`); }}>
        <Field label="Masked card number" htmlFor="pr-pan" required hint="e.g. 506100******1234"><Input id="pr-pan" value={p.maskedPan} onChange={set("maskedPan")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry month" htmlFor="pr-m" required><Input id="pr-m" inputMode="numeric" maxLength={2} value={p.expiryMonth} onChange={set("expiryMonth")} /></Field>
          <Field label="Expiry year" htmlFor="pr-y" required><Input id="pr-y" inputMode="numeric" maxLength={4} value={p.expiryYear} onChange={set("expiryYear")} /></Field>
        </div>
        <Field label="Name on card" htmlFor="pr-n" required><Input id="pr-n" value={p.embossedName} onChange={set("embossedName")} /></Field>
        <Field label="Production reference" htmlFor="pr-r" required><Input id="pr-r" value={p.productionReference} onChange={set("productionReference")} /></Field>
        <Field label="Note" htmlFor="pr-note"><Textarea id="pr-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
      </ActionDialog>
    );
  }

  const copy = {
    production: { title: "Send to card production?", desc: "The request goes to the card team.", label: "Send to production", danger: false, need: false, done: "sent to production" },
    collected: { title: "Customer has collected the card?", desc: "This closes the request.", label: "Mark as collected", danger: false, need: false, done: "marked as collected" },
    reject: { title: "Reject this card request?", desc: "The customer's request is refused. A reason is kept with it.", label: "Reject request", danger: true, need: true, done: "rejected" },
  }[kind];
  return (
    <ActionDialog open onClose={close} title={copy.title} description={copy.desc} confirmLabel={copy.label} danger={copy.danger} disabled={copy.need && note.trim().length < 3}
      onConfirm={async () => { await step.mutateAsync({ cardId: card.id, step: kind, body: note.trim() ? { note: note.trim() } : {} }); onDone(`Card request ${copy.done}.`); }}>
      <Field label={copy.need ? "Reason" : "Note (optional)"} htmlFor="cn" required={copy.need}><Textarea id="cn" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
    </ActionDialog>
  );
}

// Cards: new-card requests and physical card production. GET /card-requests, /physical-cards, /physical-cards/{id}/trail,
// and the production steps (POST /physical-cards/{id}/production | ready | collected | reject, PATCH .../pickup-branch).
export default function CardsPage() {
  const url = useUrlState();
  const tab = (url.get("tab") || "requests") as Tab;
  const status = url.get("status");
  const from = url.get("from");
  const to = url.get("to");
  const [openReq, setOpenReq] = useState<CardRequest | null>(null);
  const [act, setAct] = useState<Act>(null);
  const [done, setDone] = useState<string | null>(null);

  const q = { status: status || undefined, search: url.get("q") || undefined };
  const reqs = useCardRequests({ ...q, createdFrom: from || undefined, createdTo: to || undefined, page: url.page, size: SIZE });
  const cards = usePhysicalCards({ ...q, requestedFrom: from || undefined, requestedTo: to || undefined, page: url.page, size: SIZE });
  const active = tab === "requests" ? reqs : cards;
  const meta = active.data?.page;

  const physicalColumns: Column<PhysicalCard>[] = [
    { key: "at", header: "Requested", cell: (c) => <span className="whitespace-nowrap tabular">{formatApiDateTime(c.requestedAt)}</span> },
    { key: "acct", header: "Linked account", cell: (c) => <span className="tabular">{c.linkedAccountNumber ?? "—"}</span> },
    { key: "card", header: "Card", cell: (c) => <span>{c.maskedPan ?? "Not yet produced"}{c.embossedName && <span className="block text-xs text-ink-500">{c.embossedName}</span>}</span> },
    { key: "branch", header: "Pickup branch", cell: (c) => c.pickupBranchId ?? "—" },
    { key: "status", header: "Status", cell: (c) => <span><Badge tone={statusTone(c.status)}>{humanise(c.status)}</Badge>{c.rejectionReason && <span className="mt-1 block text-xs text-ink-500">{c.rejectionReason}</span>}</span> },
    {
      key: "action", header: "Action",
      cell: (c) => {
        const s = (c.status ?? "").toLowerCase();
        const btn = "inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-[#f1f2f5] px-3 text-[13px] font-medium hover:bg-line";
        return (
          <span className="flex flex-wrap gap-1.5">
            {s === "requested" && <button type="button" className={btn} onClick={() => setAct({ card: c, kind: "production" })}>Send to production</button>}
            {s === "in_production" && <button type="button" className={btn} onClick={() => setAct({ card: c, kind: "ready" })}>Mark ready</button>}
            {s === "ready_for_collection" && <button type="button" className={btn} onClick={() => setAct({ card: c, kind: "collected" })}>Mark collected</button>}
            {(s === "requested" || s === "in_production") && <button type="button" className={`${btn} text-red-700`} onClick={() => setAct({ card: c, kind: "reject" })}>Reject</button>}
            {s !== "collected" && s !== "rejected" && <button type="button" className={btn} onClick={() => setAct({ card: c, kind: "branch" })}>Change branch</button>}
            <button type="button" className={btn} onClick={() => setAct({ card: c, kind: "trail" })}>History</button>
          </span>
        );
      },
    },
  ];

  const statuses = tab === "requests" ? ["PENDING", "SUBMITTED", "ISSUED", "REJECTED", "FAILED"] : ["requested", "in_production", "ready_for_collection", "collected", "rejected"];

  return (
    <>
      <PageHeader title="Cards" description="New-card requests and the production of physical cards. Temporary blocks, PIN and limits are handled in Instant Card." actions={<RefreshButton />} />
      {done && <div className="mb-4"><Notice tone="success" title="Done">{done}</Notice></div>}
      <Tabs<Tab> value={tab} onChange={(t) => url.set({ tab: t === "requests" ? "" : t, status: "" })} tabs={[{ id: "requests", label: "Card requests" }, { id: "physical", label: "Physical cards" }]} />
      <Toolbar>
        <SearchField value={url.search.value} onChange={url.search.onChange} placeholder="Search by account number or name" />
        <Select aria-label="Status" value={status} onChange={(e) => url.set({ status: e.target.value })} className="w-52">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{humanise(s)}</option>)}
        </Select>
        <DateRangeButton from={from} to={to} onChange={(f, t) => url.set({ from: f, to: t })} />
      </Toolbar>

      {active.isError && !active.data ? (
        <ErrorState error={active.error} onRetry={() => void active.refetch()} title="Cards could not be loaded" />
      ) : tab === "requests" ? (
        <DataTable grid columns={requestColumns(setOpenReq)} rows={reqs.data?.data ?? []} rowKey={(r) => r.id} loading={reqs.isLoading} empty="No card request matches these filters."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={reqs.data?.data.length ?? 0} noun="requests" onPage={(p) => url.set({ page: String(p) })} />} />
      ) : (
        <DataTable grid columns={physicalColumns} rows={cards.data?.data ?? []} rowKey={(c) => c.id} loading={cards.isLoading} empty="No physical card matches these filters."
          footer={<Pager page={meta?.page ?? url.page} totalPages={meta?.totalPages} total={meta?.total} size={meta?.size ?? SIZE} shown={cards.data?.data.length ?? 0} noun="cards" onPage={(p) => url.set({ page: String(p) })} />} />
      )}

      <RequestModal r={openReq} onClose={() => setOpenReq(null)} />
      <CardActions act={act} onClose={() => setAct(null)} onDone={(m) => { setDone(m); }} />
    </>
  );
}
