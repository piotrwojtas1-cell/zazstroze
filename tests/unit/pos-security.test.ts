import { describe, expect, it } from "vitest";
import { signRequest, verifySignature } from "@/server/pos/signature";
import { createCardQrPayload, parseCardCode, QR_WINDOW_SEC } from "@/server/pos/card-qr";
import { generateCardNumber } from "@/server/services/auth";

describe("podpis HMAC żądań POS", () => {
  const secret = "sekret-testowy-1234567890";
  const ts = "1760000000";
  const body = JSON.stringify({ a: 1 });
  const sig = signRequest(secret, ts, "POST", "/api/pos/v1/transactions", body);

  it("akceptuje poprawny podpis", () => {
    expect(verifySignature({ secret, timestamp: ts, signature: sig, method: "POST", path: "/api/pos/v1/transactions", body, nowSec: 1760000010 })).toEqual({ ok: true });
  });
  it("odrzuca zmienione ciało", () => {
    expect(verifySignature({ secret, timestamp: ts, signature: sig, method: "POST", path: "/api/pos/v1/transactions", body: body + " ", nowSec: 1760000010 }).ok).toBe(false);
  });
  it("odrzuca inną ścieżkę (brak możliwości przeniesienia podpisu)", () => {
    expect(verifySignature({ secret, timestamp: ts, signature: sig, method: "POST", path: "/api/pos/v1/returns", body, nowSec: 1760000010 }).ok).toBe(false);
  });
  it("odrzuca przeterminowany znacznik czasu (replay)", () => {
    expect(verifySignature({ secret, timestamp: ts, signature: sig, method: "POST", path: "/api/pos/v1/transactions", body, nowSec: 1760000000 + 301 })).toEqual({ ok: false, reason: "STALE" });
  });
  it("odrzuca brak nagłówków", () => {
    expect(verifySignature({ secret, timestamp: null, signature: null, method: "POST", path: "/x", body })).toEqual({ ok: false, reason: "MISSING" });
  });
});

describe("dynamiczny kod QR karty", () => {
  const card = generateCardNumber();
  it("rozpoznaje świeży kod", () => {
    const { payload } = createCardQrPayload(card);
    expect(parseCardCode(payload)).toEqual({ ok: true, cardNumber: card, method: "QR" });
  });
  it("odrzuca podrobiony podpis lub podmieniony numer", () => {
    const { payload } = createCardQrPayload(card);
    const other = generateCardNumber();
    expect(parseCardCode(payload.replace(card, other))).toEqual({ ok: false, reason: "INVALID" });
    expect(parseCardCode(payload.slice(0, -2) + "xx")).toEqual({ ok: false, reason: "INVALID" });
  });
  it("odrzuca kod starszy niż 5 minut", () => {
    const now = Date.now();
    const { payload } = createCardQrPayload(card, now - 6 * 60 * 1000);
    expect(parseCardCode(payload, now)).toEqual({ ok: false, reason: "EXPIRED" });
    const recent = createCardQrPayload(card, now - 2 * QR_WINDOW_SEC * 1000).payload;
    expect(parseCardCode(recent, now).ok).toBe(true);
  });
  it("akceptuje ręcznie wpisany numer ze spacjami, odrzuca błędną sumę kontrolną", () => {
    expect(parseCardCode(card.replace(/(\d{4})/g, "$1 "))).toMatchObject({ ok: true, method: "MANUAL" });
    expect(parseCardCode("2900000000000000").ok).toBe(isLuhnOk("2900000000000000"));
  });
});

function isLuhnOk(n: string) {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}
