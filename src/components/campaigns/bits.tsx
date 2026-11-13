import { Badge } from "@/components/ui/badge";
import type { Campaign } from "@/lib/api";
import type { Tone } from "@/lib/format";

export const campaignTone: Record<Campaign["status"], Tone> = {
  "Pending approval": "warning",
  Returned: "info",
  Scheduled: "info",
  Live: "success",
  Expired: "neutral",
  Withdrawn: "neutral",
};

export const outcomeTone: Record<Campaign["outcomes"][number]["status"], Tone> = {
  Published: "success",
  Scheduled: "info",
  Failed: "danger",
  Removed: "neutral",
  "Not sent": "neutral",
};

/** How the campaign appears on one channel. USSD has no images or links, so it shows text only. */
export function ChannelPreview({ channel, title, body, link }: { channel: string; title: string; body: string; link?: string }) {
  const ussd = channel.includes("USSD");
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="mb-2 flex items-center justify-between text-xs font-medium text-ink-500">
        {channel} <Badge tone="neutral" dot={false}>Preview</Badge>
      </p>
      {ussd ? (
        <pre className="whitespace-pre-wrap rounded-lg bg-ink-900 p-3 font-mono text-xs text-white">{`${title || "Title"}\n${(body || "Message").slice(0, 140)}`}</pre>
      ) : (
        <div className="rounded-lg bg-gradient-to-br from-brand-800 to-brand-600 p-4 text-white">
          <p className="text-sm font-semibold">{title || "Title"}</p>
          <p className="mt-1 text-xs text-white/80">{body || "Message"}</p>
          {link && <span className="mt-3 inline-block rounded-md bg-accent-500 px-2.5 py-1 text-xs font-medium">Learn more</span>}
        </div>
      )}
    </div>
  );
}
