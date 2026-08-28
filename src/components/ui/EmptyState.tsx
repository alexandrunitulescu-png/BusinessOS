import { Icon, type IconName } from "@/components/shell/icons";

export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised px-6 py-14 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface-sunken text-text-subtle">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
