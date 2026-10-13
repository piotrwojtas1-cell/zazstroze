import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db";
import { POST as identifyRoute } from "@/app/api/pos/v1/identify/route";
import { POST as saleRoute } from "@/app/api/pos/v1/transactions/route";
import { POST as returnRoute } from "@/app/api/pos/v1/returns/route";
import { POST as redeemRoute } from "@/app/api/pos/v1/coupons/redeem/route";
import { createIntegration } from "@/server/pos/integrations";
import { signRequest } from "@/server/pos/signature";
import { createCardQrPayload } from "@/server/pos/card-qr";
import { redeemReward } from "@/server/loyalty/rewards";
import { env } from "@/server/env";
import { createCustomer, createReward, item, resetDb, total } from "../helpers/db";

let creds: { keyId: string; secret: string };
beforeEach(async () => {
  await resetDb();
  const { integration, secret } = await createIntegration("Kasa testowa");
  creds = { keyId: integration.keyId, secret };
});

type Route = (req: NextRequest) => Promise<Response>;

async function signed(route: Route, path: string, body: unknown, opts: { key?: string; secret?: string; ts?: number; tamper?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const sig = signRequest(opts.secret ?? creds.secret, ts, "POST", path, raw);
  const req = new NextRequest(new URL(path, env().APP_URL), {
    method: "POST",
    body: opts.tamper ? raw.replace("}", ',"x":1}') : raw,
    headers: { "content-type": "application/json", "x-zz-key-id": creds.keyId, "x-zz-timestamp": ts, "x-zz-signature": sig, "idempotency-key": opts.key ?? `key-${Math.random().toString(36).slice(2)}` },
  });
  const res = await route(req);
  return { status: res.status, json: (await res.json()) as Record<string, any>, headers: res.headers }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("API POS (podpisy HMAC, idempotencja)", () => {
  it("identyfikuje klienta po dynamicznym kodzie QR i zwraca minimum danych", async () => {
    const c = await createCustomer({ firstName: "Ewa" });
    const { payload } = createCardQrPayload(c.card!.number);
    const r = await signed(identifyRoute, "/api/pos/v1/identify", { cardCode: payload });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ cardNumber: c.card!.number, method: "QR", customerName: "Ewa K.", pointsBalance: 0 });
    expect(JSON.stringify(r.json)).not.toContain(c.email);
  });

  it("odrzuca błędny podpis, zmienione ciało, nieaktualny znacznik czasu i nieaktywną integrację", async () => {
    const body = { cardCode: "2900000000000000" };
    expect((await signed(identifyRoute, "/api/pos/v1/identify", body, { secret: "zly-sekret" })).status).toBe(401);
    expect((await signed(identifyRoute, "/api/pos/v1/identify", body, { tamper: true })).status).toBe(401);
    expect((await signed(identifyRoute, "/api/pos/v1/identify", body, { ts: Math.floor(Date.now() / 1000) - 3600 })).status).toBe(401);
    await prisma.posIntegration.updateMany({ where: { keyId: creds.keyId }, data: { active: false } });
    expect((await signed(identifyRoute, "/api/pos/v1/identify", body)).status).toBe(401);
  });

  it("sprzedaż nalicza punkty raz; ponowienie z tym samym kluczem zwraca zapamiętaną odpowiedź", async () => {
    const c = await createCustomer();
    const items = [item("ROS-1", "rosliny", 1, 12345)];
    const body = { externalId: "KASA1-0001", cardCode: c.card!.number, storeCode: "ZZ-01", occurredAt: new Date().toISOString(), totalGrosze: total(items), items };
    const first = await signed(saleRoute, "/api/pos/v1/transactions", body, { key: "sale-0001-abc" });
    expect(first.status).toBe(200);
    expect(first.json).toMatchObject({ pointsAwarded: 123, pointsBalance: 123, duplicate: false });
    const replay = await signed(saleRoute, "/api/pos/v1/transactions", body, { key: "sale-0001-abc" });
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(replay.json).toEqual(first.json);
    // Nowy klucz, ten sam externalId (np. restart kasy) → nadal bez podwójnego naliczenia.
    const retry = await signed(saleRoute, "/api/pos/v1/transactions", body, { key: "sale-0001-xyz" });
    expect(retry.json.duplicate).toBe(true);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(123);
    // Ten sam klucz z innym ciałem → 422.
    const reused = await signed(saleRoute, "/api/pos/v1/transactions", { ...body, externalId: "KASA1-0002" }, { key: "sale-0001-abc" });
    expect(reused.status).toBe(422);
    expect(reused.json.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("walidacja danych wejściowych POS zwraca 422 i trafia do dziennika błędów", async () => {
    const r = await signed(saleRoute, "/api/pos/v1/transactions", { externalId: "bad id!", cardCode: "x", items: [] });
    expect(r.status).toBe(422);
    expect(await prisma.posRequestLog.count({ where: { status: 422 } })).toBe(1);
  });

  it("kupon użyty przez POS i zwrot z korektą punktów", async () => {
    const c = await createCustomer();
    const items = [item("ROS-1", "rosliny", 2, 10000)];
    await signed(saleRoute, "/api/pos/v1/transactions", { externalId: "K-1", cardCode: c.card!.number, occurredAt: new Date().toISOString(), totalGrosze: total(items), items });
    const reward = await createReward({ pointsCost: 100 });
    const { coupon } = await redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: "pos-coupon" });
    const red = await signed(redeemRoute, "/api/pos/v1/coupons/redeem", { couponCode: coupon.code, cardCode: c.card!.number, externalTransactionId: "K-2", basketGrosze: 5000 });
    expect(red.status).toBe(200);
    expect(red.json.discountGrosze).toBe(500);
    const again = await signed(redeemRoute, "/api/pos/v1/coupons/redeem", { couponCode: coupon.code, cardCode: c.card!.number, externalTransactionId: "K-3", basketGrosze: 5000 });
    expect(again.status).toBe(409);
    const ret = await signed(returnRoute, "/api/pos/v1/returns", { externalId: "K-1-Z", originalExternalId: "K-1", occurredAt: new Date().toISOString(), items: [{ sku: "ROS-1", quantity: 1 }] });
    expect(ret.status).toBe(200);
    expect(ret.json.pointsReversed).toBe(100);
    expect(ret.json.pointsBalance).toBe(0);
  });
});
