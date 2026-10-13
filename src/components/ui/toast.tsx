"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, tone, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-lift ring-1 animate-pop",
              t.tone === "error" ? "bg-white text-danger-700 ring-danger-600/20" : "bg-forest-900 text-white ring-white/10",
            )}
          >
            {t.tone === "error" ? <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-moss-300" aria-hidden />}
            <p className="flex-1">{t.message}</p>
            <button type="button" onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} aria-label="Zamknij powiadomienie" className="opacity-70 hover:opacity-100">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
