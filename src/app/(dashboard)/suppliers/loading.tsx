import { TableSkeleton } from "@/components/ui/TableSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl">
      <TableSkeleton />
    </div>
  );
}
