"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Minus, Plus, ScanLine, Trash2, UserRound, X, CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge, Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { allocateDiscount } from "@/lib/allocate";
import { formatNumber, formatPLN } from "@/lib/money";
import { formatCardNumber } from "@/lib/luhn";
import { valueLabel, type RewardTypeName } from "@/lib/loyalty-format";
import { cn } from "@/lib/cn";

interface Product {
  sku: string;
  name: string;
  category: string;
  priceGrosze: number;
  emoji: string;
}

interface IdentifyResult {
  cardNumber: string;
  method: "QR" | "MANUAL";
  customerName: string;
  tier: { name: string } | null;
  pointsBalance: number;
  coupons: {
    code: string;
    title: string;
    type: RewardTypeName;
    valueGrosze: number | null;
    percentBp: number | null;
    minBasketGrosze: number;
    excludedCategories: string[];
    expiresAt: string;
    autoApply: boolean;
  }[];
}

interface AppliedCoupon {
  code: string;
  title: string;
  discountGrosze: number;
  excludedCategories: string[];
}

interface SaleResult {
  externalId: string;
  pointsAwarded: number;
  pointsBalance: number;
  duplicate: boolean;
  totalGrosze: number;
}

const newReceiptId = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `DEMO-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

export function DemoPos({ products }: { products: Product[] }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState<IdentifyResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [identifyError, setIdentifyError] = useState<string | null>(null);
  const [basket, setBasket] = useState<Record<string, number>>({});
  // Identyfikator paragonu generowany po stronie przeglądarki (po hydratacji), by uniknąć niezgodności SSR.
  const [receiptId, setReceiptId] = useState("");
  useEffect(() => setReceiptId(newReceiptId()), []);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(
    () => Object.entries(basket).map(([sku, quantity]) => ({ product: products.find((p) => p.sku === sku)!, quantity })).filter((l) => l.product),
    [basket, products],
  );
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.product.priceGrosze, 0);
  const total = subtotal - (coupon?.discountGrosze ?? 0);

  async function identify(raw?: string) {
    const value = (raw ?? code).trim();
    if (!value) return;
    setIdentifying(true);
    setIdentifyError(null);
    try {
      const r = await api<IdentifyResult>("/api/v1/admin/pos/identify", { body: { cardCode: value } });
      setCustomer(r);
      setCode("");
    } catch (e) {
      setIdentifyError(e instanceof ApiError ? e.message : "Nie udało się zidentyfikować karty.");
    } finally {
      setIdentifying(false);
    }
  }

  function add(sku: string, delta: number) {
    if (coupon) return toast("Zmiana koszyka po zastosowaniu kuponu — najpierw usuń kupon.", "error");
    setBasket((b) => {
      const q = (b[sku] ?? 0) + delta;
      const next = { ...b };
      if (q <= 0) delete next[sku];
      else next[sku] = q;
      return next;
    });
  }

  const itemsForCoupon = () => lines.map((l) => ({ category: l.product.category, totalGrosze: l.quantity * l.product.priceGrosze }));

  async function applyCoupon(c: string) {
    if (!customer) return;
    setCouponBusy(true);
    try {
      const r = await api<{ couponCode: string; discountGrosze: number }>("/api/v1/admin/pos/coupons/redeem", {
        body: { couponCode: c, cardCode: customer.cardNumber, externalTransactionId: receiptId, basketGrosze: subtotal, items: itemsForCoupon() },
      });
      const info = customer.coupons.find((x) => x.code === r.couponCode);
      setCoupon({ code: r.couponCode, title: info?.title ?? r.couponCode, discountGrosze: r.discountGrosze, excludedCategories: info?.excludedCategories ?? [] });
      setCouponCode("");
      toast(`Kupon zastosowany: −${formatPLN(r.discountGrosze)}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nie udało się zastosować kuponu.", "error");
    } finally {
      setCouponBusy(false);
    }
  }

  async function removeCoupon() {
    if (!coupon) return;
    setCouponBusy(true);
    try {
      await api("/api/v1/admin/pos/coupons/release", { body: { couponCode: coupon.code, externalTransactionId: receiptId, reason: "Usunięty z koszyka przez kasjera" } });
      setCoupon(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nie udało się zwolnić kuponu.", "error");
    } finally {
      setCouponBusy(false);
    }
  }

  async function finish() {
    if (!customer || lines.length === 0) return;
    setFinishing(true);
    try {
      const totals = lines.map((l) => l.quantity * l.product.priceGrosze);
      const eligible = lines.map((l) => !(coupon?.excludedCategories ?? []).includes(l.product.category));
      const discounts = allocateDiscount(totals, eligible, coupon?.discountGrosze ?? 0);
      const items = lines.map((l, i) => ({
        sku: l.product.sku,
        name: l.product.name,
        category: l.product.category,
        quantity: l.quantity,
        unitPriceGrosze: l.product.priceGrosze,
        discountGrosze: discounts[i]!,
      }));
      const r = await api<Omit<SaleResult, "totalGrosze">>("/api/v1/admin/pos/sale", {
        body: { externalId: receiptId, cardCode: customer.cardNumber, storeCode: "ZZ-01", occurredAt: new Date().toISOString(), totalGrosze: total, items },
      });
      setResult({ ...r, totalGrosze: total });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nie udało się zakończyć sprzedaży.", "error");
    } finally {
      setFinishing(false);
    }
  }

  async function reset() {
    if (coupon && !result) await removeCoupon();
    setCustomer(null);
    setBasket({});
    setCoupon(null);
    setResult(null);
    setReceiptId(newReceiptId());
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  if (result && customer) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center animate-pop" data-testid="pos-result">
        <CheckCircle2 className="mx-auto size-14 text-forest-600" aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold">Sprzedaż zakończona</h2>
        <p className="mt-1 font-mono text-sm text-muted">{result.externalId}</p>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-forest-50 p-3"><dt className="text-muted">Zapłacono</dt><dd className="mt-1 font-semibold">{formatPLN(result.totalGrosze)}</dd></div>
          <div className="rounded-xl bg-forest-50 p-3"><dt className="text-muted">Naliczono</dt><dd className="mt-1 font-semibold text-forest-700" data-testid="pos-points">+{formatNumber(result.pointsAwarded)} pkt</dd></div>
          <div className="rounded-xl bg-forest-50 p-3"><dt className="text-muted">Nowe saldo</dt><dd className="mt-1 font-semibold">{formatNumber(result.pointsBalance)} pkt</dd></div>
        </dl>
        {result.duplicate && <p className="mt-4 text-sm text-clay-700">Transakcja była już zarejestrowana — punkty nie zostały naliczone ponownie.</p>}
        <Button className="mt-6" size="lg" onClick={reset}>Następny klient</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Krok 1: identyfikacja */}
        <section className="card p-5" aria-labelledby="krok1">
          <h2 id="krok1" className="font-sans text-base font-semibold text-ink">1. Karta klienta</h2>
          {customer ? (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-forest-50 p-4" data-testid="pos-customer">
              <div className="flex gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-forest-700 text-white"><UserRound className="size-5" aria-hidden /></span>
                <div>
                  <p className="font-semibold">{customer.customerName}</p>
                  <p className="font-mono text-xs text-muted">{formatCardNumber(customer.cardNumber)} · {customer.method === "QR" ? "kod QR" : "numer wpisany ręcznie"}</p>
                  <p className="mt-1 text-sm">{customer.tier?.name} · saldo <strong>{formatNumber(customer.pointsBalance)} pkt</strong></p>
                </div>
              </div>
              <button type="button" onClick={reset} className="rounded-lg p-2 text-muted hover:bg-white" aria-label="Zmień klienta"><X className="size-4" aria-hidden /></button>
            </div>
          ) : (
            <>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void identify();
                }}
              >
                <label htmlFor="card-code" className="sr-only">Kod QR lub numer karty</label>
                <input
                  ref={inputRef}
                  id="card-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Zeskanuj kod QR lub wpisz numer karty"
                  className="input font-mono"
                  autoComplete="off"
                />
                <Button type="submit" loading={identifying}><ScanLine className="size-4" aria-hidden />Szukaj</Button>
              </form>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">Czytnik kodów działa jak klawiatura. Wklej treść kodu QR z aplikacji klienta lub 16-cyfrowy numer karty.</p>
                <CameraScanButton onCode={(v) => void identify(v)} scanning={scanning} setScanning={setScanning} />
              </div>
              {identifyError && <div className="mt-3"><Alert tone="error">{identifyError}</Alert></div>}
            </>
          )}
        </section>

        {/* Krok 2: produkty */}
        <section className={cn("card p-5", !customer && "pointer-events-none opacity-50")} aria-labelledby="krok2" inert={!customer}>
          <h2 id="krok2" className="font-sans text-base font-semibold text-ink">2. Produkty</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <li key={p.sku}>
                <button
                  type="button"
                  onClick={() => add(p.sku, 1)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 ring-forest-900/10 transition hover:bg-forest-50 hover:ring-forest-600/30"
                  data-testid={`pos-product-${p.sku}`}
                >
                  <span className="text-2xl" aria-hidden>{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 block text-xs font-medium leading-snug">{p.name}</span>
                    <span className="text-xs text-muted">{formatPLN(p.priceGrosze)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Krok 3: koszyk */}
      <aside className="card h-fit p-5 lg:sticky lg:top-6" aria-labelledby="krok3">
        <div className="flex items-center justify-between">
          <h2 id="krok3" className="font-sans text-base font-semibold text-ink">3. Paragon</h2>
          <span className="font-mono text-[11px] text-muted">{receiptId}</span>
        </div>
        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Dodaj produkty do koszyka.</p>
        ) : (
          <ul className="mt-3 divide-y divide-forest-900/5 text-sm">
            {lines.map((l) => (
              <li key={l.product.sku} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate">{l.product.name}</span>
                <button type="button" onClick={() => add(l.product.sku, -1)} className="rounded p-1 hover:bg-forest-50" aria-label={`Mniej: ${l.product.name}`}><Minus className="size-3.5" aria-hidden /></button>
                <span className="w-5 text-center tabular-nums">{l.quantity}</span>
                <button type="button" onClick={() => add(l.product.sku, 1)} className="rounded p-1 hover:bg-forest-50" aria-label={`Więcej: ${l.product.name}`}><Plus className="size-3.5" aria-hidden /></button>
                <span className="w-20 text-right tabular-nums">{formatPLN(l.quantity * l.product.priceGrosze)}</span>
              </li>
            ))}
          </ul>
        )}

        {customer && lines.length > 0 && (
          <div className="mt-4 rounded-xl bg-sand/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kupon</p>
            {coupon ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-sm" data-testid="pos-coupon-applied">
                <span>{coupon.title} <span className="font-mono text-xs text-muted">{coupon.code}</span></span>
                <button type="button" onClick={removeCoupon} disabled={couponBusy} className="rounded p-1 text-muted hover:text-danger-700" aria-label="Usuń kupon"><Trash2 className="size-4" aria-hidden /></button>
              </div>
            ) : (
              <>
                {customer.coupons.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {customer.coupons.map((c) => (
                      <li key={c.code} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {c.title} {c.autoApply && <Badge className="ml-1">aktywowany</Badge>}
                          <span className="block text-xs text-muted">{valueLabel(c.type, c.valueGrosze, c.percentBp)}{c.minBasketGrosze > 0 && ` · od ${formatPLN(c.minBasketGrosze)}`}</span>
                        </span>
                        <Button size="sm" variant="secondary" loading={couponBusy} onClick={() => applyCoupon(c.code)}>Zastosuj</Button>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (couponCode.trim()) void applyCoupon(couponCode.trim());
                  }}
                >
                  <label htmlFor="coupon-code" className="sr-only">Kod kuponu</label>
                  <input id="coupon-code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Kod kuponu" className="input h-9 py-1 font-mono text-sm" />
                  <Button type="submit" size="sm" variant="outline" loading={couponBusy}>OK</Button>
                </form>
              </>
            )}
          </div>
        )}

        <dl className="mt-4 space-y-1 border-t border-forest-900/10 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Suma</dt><dd className="tabular-nums">{formatPLN(subtotal)}</dd></div>
          {coupon && <div className="flex justify-between text-forest-700"><dt>Rabat</dt><dd className="tabular-nums">−{formatPLN(coupon.discountGrosze)}</dd></div>}
          <div className="flex justify-between text-lg font-semibold"><dt>Do zapłaty</dt><dd className="tabular-nums" data-testid="pos-total">{formatPLN(total)}</dd></div>
        </dl>
        <Button className="mt-4" block size="lg" disabled={!customer || lines.length === 0} loading={finishing} onClick={finish}>
          Zakończ sprzedaż (płatność przyjęta)
        </Button>
      </aside>
    </div>
  );
}

/** Skanowanie aparatem — tylko gdy przeglądarka wspiera BarcodeDetector (np. Chrome na Androidzie). */
function CameraScanButton({ onCode, scanning, setScanning }: { onCode: (v: string) => void; scanning: boolean; setScanning: (v: boolean) => void }) {
  const [supported, setSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => setSupported(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices), []);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = new Ctor({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (!videoRef.current) return;
        videoRef.current.srcObject = s;
        void videoRef.current.play();
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          const found = await detector.detect(videoRef.current).catch(() => []);
          if (found[0]?.rawValue) {
            onCode(found[0].rawValue);
            setScanning(false);
            return;
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      })
      .catch(() => setScanning(false));
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, onCode, setScanning]);

  if (!supported) return null;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setScanning(true)}><Camera className="size-4" aria-hidden />Aparat</Button>
      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4" role="dialog" aria-label="Skanowanie kodu QR">
          <video ref={videoRef} className="w-full max-w-sm rounded-2xl" muted playsInline />
          <Button className="mt-4" variant="light" onClick={() => setScanning(false)}>Zamknij</Button>
        </div>
      )}
    </>
  );
}
