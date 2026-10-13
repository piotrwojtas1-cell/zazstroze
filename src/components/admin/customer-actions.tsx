"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, newIdempotencyKey } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox, TextAreaField, TextField } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function AdjustPointsForm({ cardId, limit, canExceed }: { cardId: string; limit: number; canExceed: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const key = useRef(newIdempotencyKey());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const value = Number(points);
    if (!Number.isInteger(value) || value === 0) return setErrors({ points: "Podaj niezerową liczbę całkowitą (np. 50 lub -20)." });
    setLoading(true);
    try {
      await api(`/api/v1/admin/cards/${cardId}/adjust`, { body: { points: value, reason }, idempotencyKey: key.current });
      toast(`Korekta ${value > 0 ? "+" : ""}${value} pkt zapisana.`);
      setPoints("");
      setReason("");
      key.current = newIdempotencyKey();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        toast(err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <TextField label="Liczba punktów" inputMode="numeric" placeholder="np. 50 lub -20" value={points} onChange={(e) => setPoints(e.target.value)} error={errors.points} hint={canExceed ? "Bez limitu (uprawnienie administratora)." : `Maksymalnie ±${limit} pkt.`} />
      <TextAreaField label="Powód korekty (obowiązkowy)" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} className="[&_textarea]:min-h-20" hint="Trafi do historii klienta i dziennika audytu." />
      <Button type="submit" loading={loading} block>Zapisz korektę</Button>
    </form>
  );
}

export function CardStatusControl({ cardId, status }: { cardId: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const target = status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
  async function submit() {
    setLoading(true);
    try {
      await api(`/api/v1/admin/cards/${cardId}/status`, { method: "PUT", body: { status: target, reason } });
      toast(target === "BLOCKED" ? "Karta zablokowana." : "Karta odblokowana.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Błąd", "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Button variant={target === "BLOCKED" ? "outline" : "secondary"} block onClick={() => setOpen(true)}>{target === "BLOCKED" ? "Zablokuj kartę" : "Odblokuj kartę"}</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={target === "BLOCKED" ? "Zablokować kartę?" : "Odblokować kartę?"} footer={<><Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button><Button variant={target === "BLOCKED" ? "danger" : "primary"} loading={loading} disabled={reason.trim().length < 5} onClick={submit}>Potwierdź</Button></>}>
        <TextAreaField label="Powód" value={reason} onChange={(e) => setReason(e.target.value)} hint="Min. 5 znaków. Zapisywany w dzienniku audytu." />
      </Dialog>
    </>
  );
}

export function CancelCouponButton({ couponId, canRefund }: { couponId: string; canRefund: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    try {
      await api(`/api/v1/admin/coupons/${couponId}/cancel`, { body: { reason, refundPoints: refund } });
      toast("Kupon anulowany.");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Błąd", "error");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Anuluj</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Anulować kupon?" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Nie</Button><Button variant="danger" loading={loading} disabled={reason.trim().length < 5} onClick={submit}>Anuluj kupon</Button></>}>
        <div className="space-y-3">
          <TextAreaField label="Powód" value={reason} onChange={(e) => setReason(e.target.value)} />
          {canRefund && <Checkbox checked={refund} onChange={(e) => setRefund(e.target.checked)} label="Zwróć klientowi wydane punkty" />}
        </div>
      </Dialog>
    </>
  );
}
