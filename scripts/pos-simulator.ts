/**
 * Symulator kasy (format DEMO) — wysyła PODPISANE żądania HMAC do API POS, tak jak robiłby to system kasowy.
 *
 *   npm run pos:simulate -- --card 2900XXXXXXXXXXXX [--url http://localhost:3000]
 *
 * Dane integracji: plik .pos-demo-credentials.json (tworzony przez seed demo) lub zmienne POS_KEY_ID / POS_SECRET.
 * Scenariusz: identyfikacja → sprzedaż → ponowienie (idempotencja) → zwrot częściowy.
 */
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { signRequest } from "../src/server/pos/signature";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const base = arg("url") ?? process.env.APP_URL ?? "http://localhost:3000";
const card = arg("card");
const creds = existsSync(".pos-demo-credentials.json")
  ? (JSON.parse(readFileSync(".pos-demo-credentials.json", "utf8")) as { keyId: string; secret: string })
  : { keyId: process.env.POS_KEY_ID ?? "", secret: process.env.POS_SECRET ?? "" };

async function post(path: string, body: unknown, idempotencyKey = randomUUID()) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-zz-key-id": creds.keyId,
      "x-zz-timestamp": ts,
      "x-zz-signature": signRequest(creds.secret, ts, "POST", path, raw),
      "idempotency-key": idempotencyKey,
    },
    body: raw,
  });
  const json = await res.json();
  console.log(`→ POST ${path} [${res.status}]${res.headers.get("idempotent-replayed") ? " (odpowiedź z pamięci idempotencji)" : ""}\n`, JSON.stringify(json, null, 2));
  return json as Record<string, unknown>;
}

async function main() {
  if (!card) throw new Error("Podaj numer karty: --card 2900XXXXXXXXXXXX (widoczny w aplikacji klienta lub w panelu → Klienci)");
  if (!creds.keyId || !creds.secret) throw new Error("Brak danych integracji (.pos-demo-credentials.json lub POS_KEY_ID/POS_SECRET).");
  await post("/api/pos/v1/identify", { cardCode: card });
  const externalId = `SIM-${Date.now()}`;
  const items = [
    { sku: "NAS-001", name: "Cebulki tulipanów mix, 20 szt.", category: "nasiona", quantity: 2, unitPriceGrosze: 2499, discountGrosze: 0 },
    { sku: "OCH-001", name: "Agrowłóknina zimowa, 1,6 × 10 m", category: "ochrona-roslin", quantity: 1, unitPriceGrosze: 3499, discountGrosze: 0 },
  ];
  const sale = { externalId, cardCode: card, storeCode: "ZZ-01", occurredAt: new Date().toISOString(), totalGrosze: 2 * 2499 + 3499, items };
  const key = randomUUID();
  await post("/api/pos/v1/transactions", sale, key);
  console.log("Ponowienie tego samego żądania (np. timeout sieci):");
  await post("/api/pos/v1/transactions", sale, key);
  await post("/api/pos/v1/returns", { externalId: `${externalId}-Z`, originalExternalId: externalId, occurredAt: new Date().toISOString(), items: [{ sku: "NAS-001", quantity: 1 }], reason: "Symulacja zwrotu" });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
