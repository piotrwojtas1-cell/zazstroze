"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Copy, Check, SunMedium } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/money";
import { LogoMark } from "./logo";

interface QrState {
  svg: string;
  payload: string;
  expiresInSec: number;
}

export function LoyaltyCardView(props: {
  firstName: string;
  cardNumber: string;
  cardNumberFormatted: string;
  tierName: string | null;
  tierColor: string;
  pointsBalance: number;
  status: string;
  initialQr: QrState;
}) {
  const [qr, setQr] = useState(props.initialQr);
  const [secondsLeft, setSecondsLeft] = useState(props.initialQr.expiresInSec);
  const [offline, setOffline] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bright, setBright] = useState(false);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api<QrState>("/api/v1/me/card/qr");
      setQr(next);
      setSecondsLeft(next.expiresInSec);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          void refresh();
          return 30;
        }
        return s - 1;
      });
    }, 1000);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Utrzymanie włączonego ekranu podczas skanowania (jeśli przeglądarka wspiera Wake Lock API).
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (wakeLock.current = l)).catch(() => undefined);
    return () => void wakeLock.current?.release().catch(() => undefined);
  }, []);

  async function copy() {
    await navigator.clipboard?.writeText(props.cardNumber).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const blocked = props.status !== "ACTIVE";

  return (
    <section aria-label="Cyfrowa karta lojalnościowa" className={bright ? "rounded-[28px] bg-white p-2 ring-4 ring-white" : ""}>
      <div className="leaf-pattern relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-700 via-forest-800 to-forest-950 p-5 text-white shadow-lift">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <div>
              <p className="font-display text-base font-semibold leading-none">Zielony Zakątek</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-forest-100/80">Karta stałego klienta</p>
            </div>
          </div>
          {props.tierName && (
            <span className="chip bg-white/10 ring-1 ring-white/20">
              <span className="size-2 rounded-full" style={{ backgroundColor: props.tierColor }} aria-hidden />
              {props.tierName}
            </span>
          )}
        </div>

        <div className="mx-auto mt-5 w-full max-w-[260px] rounded-2xl bg-white p-3 shadow-card">
          {blocked ? (
            <div className="flex aspect-square items-center justify-center p-4 text-center text-sm font-medium text-danger-700">
              Karta jest zablokowana. Skontaktuj się ze sklepem.
            </div>
          ) : (
            <div
              className="aspect-square [&>svg]:h-full [&>svg]:w-full"
              role="img"
              aria-label={`Kod QR karty numer ${props.cardNumberFormatted}`}
              data-testid="card-qr"
              data-payload={qr.payload}
              // SVG generowany po stronie serwera przez bibliotekę qrcode z zaufanych danych.
              dangerouslySetInnerHTML={{ __html: qr.svg }}
            />
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-forest-100/90" aria-live="polite">
          {offline ? (
            <span>Brak połączenia — pokaż numer karty kasjerowi</span>
          ) : (
            <>
              <RefreshCw className="size-3.5" aria-hidden />
              <span>Nowy kod za {secondsLeft} s</span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-forest-100/80">Numer karty</p>
            <button type="button" onClick={copy} className="mt-0.5 flex items-center gap-2 whitespace-nowrap font-mono text-[15px] tracking-wide sm:text-base" aria-label="Skopiuj numer karty" data-testid="card-number">
              {props.cardNumberFormatted}
              {copied ? <Check className="size-4 text-moss-300" aria-hidden /> : <Copy className="size-4 opacity-70" aria-hidden />}
            </button>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-forest-100/80">{props.firstName}</p>
            <p className="font-display text-2xl font-semibold tabular-nums">{formatNumber(props.pointsBalance)} pkt</p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" onClick={() => setBright((b) => !b)} aria-pressed={bright} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-forest-800 hover:bg-forest-50">
          <SunMedium className="size-4" aria-hidden /> {bright ? "Tryb standardowy" : "Tryb skanowania (jasne tło)"}
        </button>
      </div>
    </section>
  );
}
