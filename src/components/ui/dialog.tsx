"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Okno modalne oparte na natywnym <dialog> (pułapka fokusu, Esc, aria-modal zapewnia przeglądarka). */
export function Dialog({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-0 text-ink shadow-lift backdrop:bg-forest-950/40 backdrop:backdrop-blur-[2px] open:animate-pop"
    >
      <div className="p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Zamknij" className="-mr-2 -mt-1 rounded-full p-2 text-muted hover:bg-forest-50">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="text-sm text-ink">{children}</div>
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </dialog>
  );
}
