import { Notice } from "@/components/ui/layout";
import { services } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

/**
 * Tells staff when the system behind a screen is down, degraded or could not be read, so stale
 * values are never mistaken for current ones (BRD DIR015, NFR020, 16.6). Renders nothing when the
 * source is healthy. `source` is the service name from GET /system-status/services.
 */
export function SourceBanner({ source, affects }: { source: string; affects: string }) {
  const s = services.find((x) => x.name === source);
  if (!s || (s.state === "Available" && s.refresh === "Current")) return null;

  const last = formatDateTime(s.lastSuccess);
  const message =
    s.state === "Unavailable" ? `${source} is unavailable. ${affects} may be out of date or incomplete. Last successful update ${last}.`
      : s.state === "Degraded" ? `${source} is responding slowly. ${affects} still works, but outcomes may take longer; check the source outcome before any retry.`
        : s.state === "Unknown" ? `The status of ${source} is unknown. Treat ${affects.toLowerCase()} as unconfirmed until it is refreshed.`
          : `${source} could not be refreshed. Showing ${affects.toLowerCase()} as last retrieved at ${last}.`;

  return (
    <div className="mb-5">
      <Notice tone={s.state === "Unavailable" ? "danger" : "warning"} title={s.state === "Unavailable" ? "Source unavailable" : s.refresh !== "Current" ? "Not refreshed" : undefined}>
        {message}{s.incident ? ` Incident ${s.incident}.` : ""}
      </Notice>
    </div>
  );
}
