import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Podpis żądań integracji POS (HMAC-SHA256).
 *   kanoniczny ciąg = `${timestamp}\n${METHOD}\n${ścieżka}\n${sha256hex(surowe ciało)}`
 *   nagłówek X-ZZ-Signature: v1=<hex>
 * Ten moduł nie zależy od serwera — używa go również symulator kasy (scripts/pos-simulator.ts).
 */
export const SIGNATURE_HEADERS = {
  keyId: "x-zz-key-id",
  timestamp: "x-zz-timestamp",
  signature: "x-zz-signature",
  idempotency: "idempotency-key",
} as const;

export const MAX_TIMESTAMP_SKEW_SEC = 300;

export function canonicalString(timestamp: string, method: string, path: string, body: string): string {
  const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
  return `${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
}

export function signRequest(secret: string, timestamp: string, method: string, path: string, body: string): string {
  return "v1=" + createHmac("sha256", secret).update(canonicalString(timestamp, method, path, body)).digest("hex");
}

export function verifySignature(params: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  method: string;
  path: string;
  body: string;
  nowSec?: number;
}): { ok: true } | { ok: false; reason: "MISSING" | "STALE" | "MISMATCH" } {
  const { secret, timestamp, signature, method, path, body } = params;
  if (!timestamp || !signature || !/^\d{9,11}$/.test(timestamp)) return { ok: false, reason: "MISSING" };
  const now = params.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > MAX_TIMESTAMP_SKEW_SEC) return { ok: false, reason: "STALE" };
  const expected = Buffer.from(signRequest(secret, timestamp, method, path, body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "MISMATCH" };
  return { ok: true };
}
