type Tone = "neutral" | "green" | "amber" | "red" | "blue";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-text-muted",
  green: "bg-positive-soft text-positive",
  amber: "bg-warning-soft text-warning",
  red: "bg-critical-soft text-critical",
  blue: "bg-info-soft text-info",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
