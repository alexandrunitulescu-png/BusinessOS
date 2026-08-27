import { requirePageAccess } from "@/lib/auth/session";

/**
 * Feature + RBAC gate for the whole `/employees` subtree. Runs in the layout so
 * the redirect fires before any child page starts streaming (a page that awaits
 * `searchParams` can otherwise emit the `<head>` first, turning the redirect
 * into a soft 200 instead of a 307).
 */
export default async function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess("employees", "read", "EMPLOYEES");
  return <>{children}</>;
}
