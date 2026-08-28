import Link from "next/link";
import { Icon } from "@/components/shell/icons";

/**
 * Placeholder body for sections whose feature ships in a later milestone. Keeps
 * the app shell fully navigable so nav links never dead-end during a demo.
 */
export function ComingSoon({
  title,
  milestone,
  description,
}: {
  title: string;
  milestone: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-surface-sunken text-text-subtle">
        <Icon name="settings" className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-text">{title}</h1>
      <p className="mt-1.5 text-sm text-text-muted">{description}</p>
      <p className="mt-4 inline-block rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-text-muted">
        Programat pentru {milestone}
      </p>
      <div className="mt-6">
        <Link href="/dashboard" className="text-sm font-medium text-text hover:underline">
          ← Înapoi la panoul principal
        </Link>
      </div>
    </div>
  );
}
