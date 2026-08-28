import type { IconName } from "@/components/shell/icons";
import { Icon } from "@/components/shell/icons";

type Tone = "default" | "positive" | "warning";

const TONE_ICON: Record<Tone, string> = {
  default: "bg-surface-sunken text-text-muted",
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
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
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text-muted">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONE_ICON[tone]}`}>
          <Icon name={icon} className="h-[1.125rem] w-[1.125rem]" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-subtle">{hint}</p>}
    </div>
  );
}
