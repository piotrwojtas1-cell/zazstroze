"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api-client";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { formatNumber, formatPLN } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { valueLabel, type RewardTypeName } from "@/lib/loyalty-format";

interface RewardItem {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  emoji: string;
  type: RewardTypeName;
  valueGrosze: number | null;
  percentBp: number | null;
  minBasketGrosze: number;
  validDays: number;
  outOfStock: boolean;
  requiredTier: { name: string; minPoints: number } | null;
}

export function RewardCatalog({ rewards, balance, cardActive, tierMinPoints }: { rewards: RewardItem[]; balance: number; cardActive: boolean; tierMinPoints: number }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<RewardItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; title: string; expiresAt: string } | null>(null);
  // Jeden klucz idempotencji na otwarte okno potwierdzenia — podwójne kliknięcie nie utworzy dwóch kuponów.
  const keyRef = useRef<string>("");

  function open(r: RewardItem) {
    keyRef.current = newIdempotencyKey();
    setError(null);
    setSelected(r);
  }

  async function confirm() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ coupon: { code: string; title: string; expiresAt: string } }>(`/api/v1/rewards/${selected.id}/redeem`, {
        method: "POST",
        idempotencyKey: keyRef.current,
      });
      setSelected(null);
      setResult(r.coupon);
      toast("Nagroda odebrana! Kupon czeka w zakładce „Moje kupony”.");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Nie udało się odebrać nagrody.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rewards.map((r) => {
          const locked = r.requiredTier && tierMinPoints < r.requiredTier.minPoints;
          const missing = r.pointsCost - balance;
          const canRedeem = cardActive && !locked && !r.outOfStock && missing <= 0;
          return (
            <li key={r.id} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-3xl" aria-hidden>{r.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-sans text-[15px] font-semibold text-ink">{r.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">{r.description}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.requiredTier && <Badge tone={locked ? "gray" : "moss"}>{locked && <Lock className="size-3" aria-hidden />}Poziom {r.requiredTier.name}+</Badge>}
                {r.minBasketGrosze > 0 && <Badge tone="gray">Zakupy od {formatPLN(r.minBasketGrosze)}</Badge>}
                {r.outOfStock && <Badge tone="red">Wyczerpana</Badge>}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <p className="font-display text-xl font-semibold text-forest-800">{formatNumber(r.pointsCost)} pkt</p>
                {canRedeem ? (
                  <Button size="sm" onClick={() => open(r)}>Odbierz</Button>
                ) : (
                  <span className="text-right text-xs font-medium text-muted">
                    {!cardActive ? "Karta nieaktywna" : locked ? `Od poziomu ${r.requiredTier!.name}` : r.outOfStock ? "Niedostępna" : `Brakuje ${formatNumber(missing)} pkt`}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={!!selected}
        onClose={() => !loading && setSelected(null)}
        title="Potwierdź wymianę"
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={loading}>Anuluj</Button>
            <Button onClick={confirm} loading={loading}>Wymień {selected && formatNumber(selected.pointsCost)} pkt</Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-3">
            <p>
              Wymieniasz <strong>{formatNumber(selected.pointsCost)} pkt</strong> na <strong>{selected.name}</strong> ({valueLabel(selected.type, selected.valueGrosze, selected.percentBp)}).
            </p>
            <p className="text-muted">Po wymianie zostanie Ci {formatNumber(balance - selected.pointsCost)} pkt. Kupon będzie ważny {selected.validDays} dni. Wymiany nie można cofnąć.</p>
            {error && <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 font-medium text-danger-700">{error}</p>}
          </div>
        )}
      </Dialog>

      <Dialog open={!!result} onClose={() => setResult(null)} title="Gotowe! 🎉" footer={<ButtonLink href="/kupony">Przejdź do kuponów</ButtonLink>}>
        {result && (
          <div className="space-y-3 text-center">
            <p>Twój kupon „{result.title}”:</p>
            <p className="rounded-xl bg-forest-50 py-3 font-mono text-xl font-semibold tracking-wider text-forest-900" data-testid="new-coupon-code">{result.code}</p>
            <p className="text-muted">Ważny do {formatDate(result.expiresAt)}. Aktywuj go w zakładce kuponów, a kasa zastosuje go automatycznie.</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
