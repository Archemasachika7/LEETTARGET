import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn.js";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Replaces the label while `loading` — "Generating practice set…" tells the
   * reader what is happening, where a bare spinner doesn't. */
  loadingText?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-contrast hover:bg-brand/90 shadow-sm shadow-brand/20",
  secondary: "border border-border bg-elevated text-text hover:border-border-strong hover:bg-surface",
  ghost: "text-text-secondary hover:bg-surface hover:text-text",
  danger: "border border-danger/30 text-danger hover:bg-danger/10",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "secondary", size = "md", loading, loadingText, disabled, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded font-medium",
        "transition-colors duration-fast",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});
