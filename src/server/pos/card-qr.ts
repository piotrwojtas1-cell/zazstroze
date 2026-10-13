import "server-only";
import { env } from "../env";
import { hmacSha256, safeEqual } from "../crypto";
import { isValidLuhn, normalizeCardNumber } from "@/lib/luhn";

/**
 * Dynamiczny kod QR karty: ZZ1.<numer karty>.<okno czasowe>.<podpis HMAC>
 * Okno zmienia się co 30 s, kod jest akceptowany przez 5 minut (zrzut ekranu szybko traci ważność).
 * Numer karty pozostaje czytelny dla kasjera jako ręczna alternatywa.
 */
export const QR_WINDOW_SEC = 30;
const QR_ACCEPT_WINDOWS = 10;

const sign = (card: string, window: number) =>
  hmacSha256(env().CARD_QR_SECRET, `${card}.${window}`).toString("base64url").slice(0, 22);

export function createCardQrPayload(cardNumber: string, now = Date.now()): { payload: string; expiresInSec: number } {
  const window = Math.floor(now / 1000 / QR_WINDOW_SEC);
  const elapsed = Math.floor(now / 1000) % QR_WINDOW_SEC;
  return { payload: `ZZ1.${cardNumber}.${window}.${sign(cardNumber, window)}`, expiresInSec: QR_WINDOW_SEC - elapsed };
}

export type CardCodeResult =
  | { ok: true; cardNumber: string; method: "QR" | "MANUAL" }
  | { ok: false; reason: "INVALID" | "EXPIRED" };

/** Rozpoznaje kod zeskanowany lub wpisany na kasie (podpisany QR albo numer karty z sumą kontrolną). */
export function parseCardCode(raw: string, now = Date.now()): CardCodeResult {
  const value = raw.trim();
  if (value.startsWith("ZZ1.")) {
    const [, card, windowStr, sig] = value.split(".");
    if (!card || !windowStr || !sig || !/^\d{16}$/.test(card) || !/^\d+$/.test(windowStr)) return { ok: false, reason: "INVALID" };
    const window = Number(windowStr);
    if (!safeEqual(sign(card, window), sig)) return { ok: false, reason: "INVALID" };
    const current = Math.floor(now / 1000 / QR_WINDOW_SEC);
    if (window > current + 1 || current - window > QR_ACCEPT_WINDOWS) return { ok: false, reason: "EXPIRED" };
    return { ok: true, cardNumber: card, method: "QR" };
  }
  const digits = normalizeCardNumber(value);
  if (/^\d{16}$/.test(digits) && isValidLuhn(digits)) return { ok: true, cardNumber: digits, method: "MANUAL" };
  return { ok: false, reason: "INVALID" };
}
