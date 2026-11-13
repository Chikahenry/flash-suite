"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, ReadOnlyField, Textarea } from "@/components/ui/form";
import { Card, DefinitionGrid, EmptyState, Notice, PageHeader } from "@/components/ui/layout";
import { campaignTone, ChannelPreview, outcomeTone } from "@/components/campaigns/bits";
import { StepUpModal } from "@/components/requests/step-up-modal";
import { useRaise } from "@/components/requests/use-raise";
import { campaigns, getSession } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

// One campaign: the submitted version, per-channel outcomes, checker decision and version history (BRD DCA-012..015).
export default function CampaignPage() {
  const { id } = useParams<{ id: string }>();
  const c = campaigns.find((x) => x.id === id);
  const session = getSession();
  const [decision, setDecision] = useState<"Scheduled" | "Returned" | "Rejected" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const [raise, modal] = useRaise();

  if (!c) return <EmptyState title="Campaign not found" action={<Link href="/campaigns" className="text-sm font-medium text-brand-700">Back to campaigns</Link>} />;

  const pending = c.status === "Pending approval" && !decision;
  const isMaker = c.maker === session.name;
  const failed = c.outcomes.filter((o) => o.status === "Failed");
  const decide = (d: "Returned" | "Rejected") => {
    if (!reason.trim()) return setError("Give a reason when you reject or return a campaign.");
    setError(null);
    setDecision(d);
  };
  const change = (action: string, warning: string) => raise({ action, target: `${c.title} (${c.id})`, evidence: ["Brand instruction"], warning, danger: action !== "Amend campaign", internal: true });

  return (
    <>
      <PageHeader
        back={<Link href="/campaigns" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Campaigns</Link>}
        title={c.title}
        description={`${c.id} · Version ${c.version} · Brand ref ${c.sourceRef}`}
        actions={
          <>
            <Badge tone={decision ? (decision === "Scheduled" ? "info" : "neutral") : campaignTone[c.status]}>{decision ?? c.status}</Badge>
            {(c.status === "Live" || c.status === "Scheduled") && (
              <>
                <Button variant="secondary" onClick={() => change("Amend campaign", "The displayed version stays in place until the amendment is approved and the channel confirms it.")}>Amend</Button>
                <Button variant="secondary" onClick={() => change("Suspend campaign", "Early suspension needs fresh approval.")}>Suspend</Button>
                <Button variant="danger-soft" onClick={() => change("Withdraw campaign", "The campaign is shown as removed only when each channel confirms removal.")}>Withdraw</Button>
              </>
            )}
          </>
        }
      />

      {failed.length > 0 && (
        <div className="mb-5">
          <Notice tone="danger" title="Publication partially completed">
            {failed.map((f) => f.channel).join(", ")} did not confirm publication. Only the failed channel is retried; published channels are left alone.
          </Notice>
        </div>
      )}
      {decision === "Scheduled" && <div className="mb-5"><Notice tone="success" title="Approved">Sent to the selected channels for scheduling. Each channel reports its own outcome below.</Notice></div>}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Submitted version">
            <DefinitionGrid>
              <ReadOnlyField label="Starts (WAT)" value={formatDateTime(c.start)} />
              <ReadOnlyField label="Ends (WAT)" value={formatDateTime(c.end)} />
              <ReadOnlyField label="Maker" value={c.maker} />
              <ReadOnlyField label="Checker" value={c.checker ?? "Not yet decided"} />
              <ReadOnlyField label="Link" value={c.link ?? "None"} />
            </DefinitionGrid>
            <div className="mt-5 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
              {c.channels.map((ch) => <ChannelPreview key={ch} channel={ch} title={c.title} body={c.body} link={c.link} />)}
            </div>
          </Card>
          <Card title="Channel outcomes" padded={false}>
            <ul className="divide-y divide-line">
              {c.outcomes.map((o) => (
                <li key={o.channel} className="flex items-center justify-between px-5 py-3 text-sm">
                  {o.channel}
                  <span className="flex items-center gap-2">
                    {o.status === "Failed" && <Button variant="secondary" size="sm">Retry this channel</Button>}
                    <Badge tone={outcomeTone[o.status]}>{o.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Decision">
            {pending && !isMaker ? (
              <div className="flex flex-col gap-4">
                <p className="text-[13px] text-ink-500">You are approving version {c.version} exactly as previewed.</p>
                {error && <Notice tone="danger">{error}</Notice>}
                <Field label="Reason" htmlFor="cd-reason" hint="Required to reject or return."><Textarea id="cd-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                <Button block onClick={() => setStepUp(true)}>Approve and schedule</Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => decide("Returned")}>Return</Button>
                  <Button variant="danger-soft" onClick={() => decide("Rejected")}>Reject</Button>
                </div>
              </div>
            ) : pending ? (
              <Notice tone="info">You submitted this campaign. A different Support checker must decide on it.</Notice>
            ) : (
              <p className="text-[13px] text-ink-500">No decision is open for this campaign.</p>
            )}
          </Card>
          <Card title="Version history">
            <ol className="flex flex-col gap-4">
              {c.versions.map((v, i) => (
                <li key={i} className="relative pl-5">
                  <span aria-hidden className="absolute left-0 top-1.5 size-2 rounded-full bg-brand-600" />
                  <p className="text-sm font-medium">Version {v.version}: {v.note}</p>
                  <p className="text-xs text-ink-500">{v.by} · {formatDateTime(v.at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
      <StepUpModal open={stepUp} onClose={() => setStepUp(false)} onVerified={() => { setStepUp(false); setDecision("Scheduled"); }} actionLabel={`approve ${c.id}`} />
      {modal}
    </>
  );
}
