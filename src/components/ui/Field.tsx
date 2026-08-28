"use client";

import { forwardRef } from "react";

const controlClass =
  "w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text outline-none transition-colors focus:border-brand disabled:bg-surface-sunken aria-[invalid=true]:border-critical";

export function Field({
  label,
  error,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text">
        {label}
        {required && <span className="ml-0.5 text-critical">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-text-subtle">{hint}</p>}
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={`${controlClass} ${className}`} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea ref={ref} className={`${controlClass} min-h-[4.5rem] ${className}`} {...props} />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", children, ...props }, ref) {
  return (
    <select ref={ref} className={`${controlClass} ${className}`} {...props}>
      {children}
    </select>
  );
});
