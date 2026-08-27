import type { IconName } from "@/components/shell/icons";
import { Icon } from "@/components/shell/icons";

type Tone = "default" | "positive" | "warning";

const TONE_ICON: Record<Tone, string> = {
  default: "bg-slate-100 text-slate-500",
  positive: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
};

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONE_ICON[tone]}`}>
          <Icon name={icon} className="h-[1.125rem] w-[1.125rem]" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
