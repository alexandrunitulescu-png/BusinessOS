export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-lg font-semibold tracking-tight text-text">
            BusinessPuls
          </span>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
