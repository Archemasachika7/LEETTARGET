import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "../lib/cn.js";

type ToastTone = "success" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | undefined>(undefined);

/** Confirmation for actions whose result isn't already obvious on screen.
 * Bottom-right on desktop, bottom-centre on mobile (thumb reach, and clear of
 * the bottom nav), auto-dismissing so they never need managing. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:items-end sm:p-0"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border bg-elevated py-2 pl-3 pr-2 text-[13px] text-text shadow-lg shadow-black/10"
            )}
          >
            {t.tone === "success" && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />}
            {t.tone === "info" && <Info className="h-4 w-4 shrink-0 text-info" aria-hidden />}
            {t.tone === "warning" && <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />}
            <span>{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="ml-1 rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface hover:text-text"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}
