import type { MonthlyPoint } from "@/lib/reports/queries";
import { formatMoney } from "@/lib/format";

const MONTH_LABELS = [
  "ian", "feb", "mar", "apr", "mai", "iun",
  "iul", "aug", "sep", "oct", "noi", "dec",
];

function monthLabel(ym: string): string {
  const m = Number(ym.slice(5, 7));
  return MONTH_LABELS[m - 1] ?? ym;
}

/** Grouped bar chart: invoiced vs expenses per month. Pure SVG, no deps. */
export function MonthlyBarChart({
  data,
  currency,
}: {
  data: MonthlyPoint[];
  currency: string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.invoiced, d.expenses]));
  const width = Math.max(320, data.length * 56);
  const height = 200;
  const pad = { top: 12, bottom: 24, left: 8, right: 8 };
  const plotH = height - pad.top - pad.bottom;
  const groupW = (width - pad.left - pad.right) / data.length;
  const barW = Math.min(16, groupW / 2.6);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full min-w-[320px]" role="img">
        {data.map((d, i) => {
          const x = pad.left + i * groupW + groupW / 2;
          const invH = (d.invoiced / max) * plotH;
          const expH = (d.expenses / max) * plotH;
          const baseY = pad.top + plotH;
          return (
            <g key={d.month}>
              <rect
                x={x - barW - 1}
                y={baseY - invH}
                width={barW}
                height={invH}
                rx={2}
                className="fill-slate-800"
              >
                <title>{`${monthLabel(d.month)}: facturat ${formatMoney(d.invoiced, currency)}`}</title>
              </rect>
              <rect
                x={x + 1}
                y={baseY - expH}
                width={barW}
                height={expH}
                rx={2}
                className="fill-amber-400"
              >
                <title>{`${monthLabel(d.month)}: cheltuieli ${formatMoney(d.expenses, currency)}`}</title>
              </rect>
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-400 text-[10px]"
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" /> Facturat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Cheltuieli
        </span>
      </div>
    </div>
  );
}
