"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { Card, Notice, PageHeader } from "@/components/ui/layout";
import { ChannelPreview } from "@/components/campaigns/bits";
import { CHANNELS } from "@/lib/api";

// Maker form with per-channel preview and validation before submission (BRD DCA-009..011).
export default function NewCampaignPage() {
  const [title, setTitle] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const submit = () => {
    const e: string[] = [];
    if (!title.trim()) e.push("Enter a title.");
    if (!sourceRef.trim()) e.push("Enter the Brand Communication source reference.");
    if (!body.trim()) e.push("Enter the campaign message.");
    if (channels.length === 0) e.push("Select at least one channel.");
    if (!start || !end) e.push("Enter the start and end date and time.");
    else if (end <= start) e.push("The end must be after the start.");
    if (link && !/^https:\/\/\S+\.\S+/.test(link)) e.push("The link must be a full https:// address.");
    setErrors(e);
    if (e.length === 0) setDone(true);
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-xl">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 size={40} className="text-accent-500" aria-hidden />
          <h1 className="text-xl font-semibold">Campaign submitted</h1>
          <p className="max-w-sm text-sm text-ink-700">{title} is waiting for a different Support checker. Nothing is displayed on any channel until it is approved and the channel confirms publication.</p>
          <Link href="/campaigns" className="text-sm font-medium text-brand-700 hover:underline">Back to campaigns</Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <PageHeader back={<Link href="/campaigns" className="inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} aria-hidden /> Campaigns</Link>} title="New campaign" description="Enter the content exactly as supplied by Brand Communication." />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card>
          <div className="flex flex-col gap-4">
            {errors.length > 0 && <Notice tone="danger" title="Fix these before submitting"><ul className="list-disc pl-4">{errors.map((x) => <li key={x}>{x}</li>)}</ul></Notice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="c-title" required><Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="Brand source reference" htmlFor="c-src" required><Input id="c-src" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="e.g. BRAND-2026-311" /></Field>
            </div>
            <Field label="Message" htmlFor="c-body" required hint="USSD shows the first 140 characters as plain text."><Textarea id="c-body" value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            <Field label="Artwork" htmlFor="c-art" hint="PNG or JPG, up to 2 MB. Files are scanned before the checker can open them.">
              <label htmlFor="c-art" className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface px-4 py-6 text-[13px] text-ink-500 hover:bg-white">
                <Upload size={16} aria-hidden /> Choose a file
                <input id="c-art" type="file" accept="image/png,image/jpeg" className="sr-only" />
              </label>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Link (optional)" htmlFor="c-link"><Input id="c-link" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://" /></Field>
              <Field label="Audience reference (optional)" htmlFor="c-aud" hint="The audience list stays in its source system."><Input id="c-aud" value={audience} onChange={(e) => setAudience(e.target.value)} /></Field>
              <Field label="Start (WAT)" htmlFor="c-start" required><Input id="c-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
              <Field label="End (WAT)" htmlFor="c-end" required hint="The campaign stops displaying automatically at this time."><Input id="c-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium">Channels <span className="text-red-600">*</span></legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHANNELS.map((ch) => <Checkbox key={ch} label={ch} checked={channels.includes(ch)} onChange={() => setChannels((c) => (c.includes(ch) ? c.filter((x) => x !== ch) : [...c, ch]))} />)}
              </div>
            </fieldset>
            <div className="flex justify-end border-t border-line pt-4"><Button onClick={submit}>Submit for approval</Button></div>
          </div>
        </Card>
        <Card title="Preview by channel">
          {channels.length === 0 ? <p className="text-[13px] text-ink-500">Select a channel to preview it.</p> : (
            <div className="flex flex-col gap-3">{channels.map((ch) => <ChannelPreview key={ch} channel={ch} title={title} body={body} link={link} />)}</div>
          )}
        </Card>
      </div>
    </>
  );
}
