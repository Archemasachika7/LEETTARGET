import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

const FIELD =
  "w-full rounded-sm border border-border bg-elevated px-2.5 py-2 text-sm text-text " +
  "placeholder:text-text-muted transition-colors duration-fast " +
  "hover:border-border-strong focus:border-brand disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cn(FIELD, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(FIELD, "resize-y", className)} {...rest} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={cn(FIELD, "cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text-secondary">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}

/** A row of mutually exclusive choices — session size, difficulty, mode.
 * Reads faster than a `<select>` when there are only a handful of options and
 * the choice is part of the primary flow rather than buried in settings. */
export function ChoiceGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 border border-border bg-surface p-1", className)} role="group" aria-label={label}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-sm px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors duration-fast",
              selected ? "bg-brand text-brand-contrast" : "text-text-muted hover:text-text"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
