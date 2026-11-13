export interface BarDatum {
  label: string;
  values: number[];
}

/** Next round number above the largest value, so the axis ends on a labelled gridline. */
function niceMax(max: number): number {
  if (max <= 5) return 5;
  const step = max <= 10 ? 2 : max <= 20 ? 5 : max <= 50 ? 10 : 20;
  return Math.ceil(max / step) * step;
}

/**
 * Grouped bars: one group per period, one bar per series, side by side.
 * Hand-drawn SVG with a hidden table beside it, so the same numbers reach screen readers.
 * Series colours come from the theme tokens and the legend names each one in words.
 */
export function BarChart({ data, series, title }: { data: BarDatum[]; series: { name: string; colour: string }[]; title: string }) {
  const W = 680, H = 260;
  const pad = { l: 36, r: 8, t: 12, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const top = niceMax(Math.max(0, ...data.flatMap((d) => d.values)));
  const ticks = 5;
  const group = innerW / Math.max(1, data.length);
  const barW = Math.min(26, (group * 0.7) / series.length);
  const y = (v: number) => pad.t + innerH - (v / top) * innerH;

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">{title}</span>
        <span className="flex items-center gap-4 text-xs text-ink-700">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.colour }} /> {s.name}
            </span>
          ))}
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${data.map((d) => `${d.label}: ${series.map((s, i) => `${d.values[i]} ${s.name.toLowerCase()}`).join(", ")}`).join("; ")}.`} className="h-auto w-full">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (top / ticks) * i;
          return (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={i === 0 ? 1.5 : 1} />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-500)">{Number.isInteger(v) ? v : v.toFixed(1)}</text>
            </g>
          );
        })}
        {data.map((d, gi) => {
          const gx = pad.l + group * gi + group / 2;
          const startX = gx - (barW * series.length + 3 * (series.length - 1)) / 2;
          return (
            <g key={d.label}>
              {series.map((s, si) => {
                const v = d.values[si] ?? 0;
                const bx = startX + si * (barW + 3);
                return (
                  <g key={s.name}>
                    <rect x={bx} y={y(v)} width={barW} height={Math.max(0, pad.t + innerH - y(v))} rx={3} fill={s.colour} />
                    {v > 0 && <text x={bx + barW / 2} y={y(v) - 4} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="var(--color-ink-700)">{v}</text>}
                  </g>
                );
              })}
              <text x={gx} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-ink-500)">{d.label}</text>
            </g>
          );
        })}
      </svg>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th scope="col">Period</th>{series.map((s) => <th key={s.name} scope="col">{s.name}</th>)}</tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th>{d.values.map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  );
}
