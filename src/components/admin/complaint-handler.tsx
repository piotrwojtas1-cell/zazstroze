"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ComplaintHandler({ id, status, resolution }: { id: string; status: string; resolution: string }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(status);
  const [r, setR] = useState(resolution);
  const [saving, setSaving] = useState(false);
  return (
    <div className="mt-4 grid gap-2 border-t border-forest-900/5 pt-4 sm:grid-cols-[180px_1fr_auto]">
      <label className="sr-only" htmlFor={`st-${id}`}>Status</label>
      <select id={`st-${id}`} value={s} onChange={(e) => setS(e.target.value)} className="input h-10 py-1 text-sm">
        <option value="OPEN">Nowe</option>
        <option value="IN_PROGRESS">W trakcie</option>
        <option value="RESOLVED">Rozpatrzone</option>
        <option value="REJECTED">Odrzucone</option>
      </select>
      <label className="sr-only" htmlFor={`res-${id}`}>Odpowiedź dla klienta</label>
      <input id={`res-${id}`} value={r} onChange={(e) => setR(e.target.value)} placeholder="Odpowiedź dla klienta (widoczna w aplikacji)" className="input h-10 py-1 text-sm" maxLength={1000} />
      <Button
        size="sm"
        className="h-10"
        loading={saving}
        onClick={async () => {
          setSaving(true);
          try {
            await api(`/api/v1/admin/complaints/${id}`, { method: "PATCH", body: { status: s, resolution: r || undefined } });
            toast("Zapisano zgłoszenie.");
            router.refresh();
          } catch (e) {
            toast(e instanceof ApiError ? e.message : "Błąd", "error");
          } finally {
            setSaving(false);
          }
        }}
      >
        Zapisz
      </Button>
      <p className="text-xs text-muted sm:col-span-3">Jeśli zgłoszenie wymaga doliczenia punktów, wykonaj korektę na karcie klienta (wymaga uprawnienia do korekt).</p>
    </div>
  );
}
