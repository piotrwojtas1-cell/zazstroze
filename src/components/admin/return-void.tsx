"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function ReturnVoidActions({ externalId, items, hasReturns }: { externalId: string; items: { sku: string; name: string; available: number }[]; hasReturns: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"return" | "void" | null>(null);
  const selected = Object.entries(qty).filter(([, q]) => q > 0).map(([sku, quantity]) => ({ sku, quantity }));

  async function doReturn() {
    setBusy("return");
    try {
      const r = await api<{ pointsReversed: number; refundGrosze: number }>("/api/v1/admin/pos/return", {
        body: { externalId: `ZWR-${externalId}-${Date.now().toString(36).toUpperCase()}`, originalExternalId: externalId, occurredAt: new Date().toISOString(), items: selected, reason: reason || undefined },
      });
      toast(`Zwrot zarejestrowany. Odjęto ${r.pointsReversed} pkt.`);
      setQty({});
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Błąd zwrotu", "error");
    } finally {
      setBusy(null);
    }
  }
  async function doVoid() {
    if (reason.trim().length < 3) return toast("Podaj powód anulowania.", "error");
    setBusy("void");
    try {
      const r = await api<{ pointsReversed: number }>("/api/v1/admin/pos/void", { body: { externalId, reason } });
      toast(`Transakcja anulowana. Cofnięto ${r.pointsReversed} pkt.`);
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Błąd anulowania", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.sku} className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate">{i.name} <span className="text-xs text-muted">(dostępne do zwrotu: {i.available})</span></span>
            <label className="sr-only" htmlFor={`ret-${i.sku}`}>Ilość do zwrotu: {i.name}</label>
            <input id={`ret-${i.sku}`} type="number" min={0} max={i.available} disabled={i.available === 0} value={qty[i.sku] ?? 0} onChange={(e) => setQty({ ...qty, [i.sku]: Math.max(0, Math.min(i.available, Number(e.target.value) || 0)) })} className="input h-9 w-20 py-1" />
          </li>
        ))}
      </ul>
      <TextField label="Powód" optional={false} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="np. roślina uszkodzona" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={doReturn} loading={busy === "return"} disabled={selected.length === 0}>Zarejestruj zwrot</Button>
        {!hasReturns && <Button variant="danger" onClick={doVoid} loading={busy === "void"}>Anuluj całą transakcję</Button>}
      </div>
      <p className="text-xs text-muted">Zwrot odejmuje proporcjonalnie punkty za zwrócone pozycje. Anulowanie cofa wszystkie punkty i zwalnia użyte kupony.</p>
    </div>
  );
}
