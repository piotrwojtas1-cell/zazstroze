import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { recordSale, recordReturn, voidSale } from "@/server/loyalty/transactions";
import { redeemReward } from "@/server/loyalty/rewards";
import { redeemCoupon, expireCoupons, releaseByPos, setCouponActivation, validateCoupon } from "@/server/loyalty/coupons";
import { getInternalIntegration } from "@/server/pos/integrations";
import { balanceIntegrityCheck } from "@/server/services/reports";
import { AppError } from "@/server/errors";
import { createCustomer, createReward, item, resetDb, total } from "../helpers/db";

let integrationId: string;
beforeEach(async () => {
  await resetDb();
  integrationId = (await getInternalIntegration()).id;
});

const sale = (cardId: string, externalId: string, items = [item("ROS-1", "rosliny", 2, 5000)]) =>
  recordSale({ integrationId, externalId, cardId, occurredAt: new Date(), items, totalGrosze: total(items), storeCode: "ZZ-01" });

async function expectCode(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

describe("naliczanie punktów", () => {
  it("nalicza punkty za kwalifikujące się pozycje i zapisuje rejestr", async () => {
    const c = await createCustomer();
    const r = await sale(c.card!.id, "PAR-1", [item("ROS-1", "rosliny", 2, 5000), item("KAR-1", "karty-podarunkowe", 1, 5000)]);
    expect(r.pointsAwarded).toBe(100);
    expect(r.balance).toBe(100);
    const ledger = await prisma.pointsLedger.findMany({ where: { cardId: c.card!.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: "EARN", points: 100, balanceAfter: 100 });
  });

  it("ta sama transakcja przesłana ponownie nie nalicza punktów drugi raz", async () => {
    const c = await createCustomer();
    const first = await sale(c.card!.id, "PAR-2");
    const second = await sale(c.card!.id, "PAR-2");
    expect(second.duplicate).toBe(true);
    expect(second.transaction.id).toBe(first.transaction.id);
    const card = await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } });
    expect(card.pointsBalance).toBe(100);
  });

  it("równoległe przesłanie tej samej transakcji — dokładnie jedno naliczenie", async () => {
    const c = await createCustomer();
    const results = await Promise.all(Array.from({ length: 6 }, () => sale(c.card!.id, "PAR-RACE")));
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    expect(await prisma.transaction.count({ where: { externalId: "PAR-RACE" } })).toBe(1);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(100);
  });

  it("odrzuca niezgodną sumę, transakcję z przyszłości i zablokowaną kartę", async () => {
    const c = await createCustomer();
    const items = [item("A", "rosliny", 1, 1000)];
    await expectCode(recordSale({ integrationId, externalId: "X1", cardId: c.card!.id, occurredAt: new Date(), items, totalGrosze: 999 }), "TRANSACTION_MISMATCH");
    await expectCode(recordSale({ integrationId, externalId: "X2", cardId: c.card!.id, occurredAt: new Date(Date.now() + 3600_000), items, totalGrosze: 1000 }), "VALIDATION_ERROR");
    await prisma.loyaltyCard.update({ where: { id: c.card!.id }, data: { status: "BLOCKED" } });
    await expectCode(sale(c.card!.id, "X3"), "CARD_INACTIVE");
  });

  it("aktywna kampania dodaje bonus, a awans na wyższy poziom jest natychmiastowy", async () => {
    const c = await createCustomer();
    await prisma.campaign.create({ data: { name: "x2 rośliny", description: "test", type: "POINTS_MULTIPLIER", multiplierBp: 20000, categories: ["rosliny"], startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000) } });
    const r = await sale(c.card!.id, "PAR-K", [item("ROS-1", "rosliny", 1, 50000)]);
    expect(r.pointsAwarded).toBe(1000);
    const card = await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id }, include: { tier: true } });
    expect(card.tier?.key).toBe("KRZEW");
    expect(await prisma.pointsLedger.count({ where: { cardId: c.card!.id, type: "BONUS" } })).toBe(1);
  });
});

describe("wymiana punktów na nagrodę", () => {
  it("odrzuca przy braku punktów, a po spełnieniu warunków tworzy kupon i obciąża saldo", async () => {
    const c = await createCustomer();
    const reward = await createReward({ pointsCost: 100 });
    await expectCode(redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: "k1" }), "INSUFFICIENT_POINTS");
    await sale(c.card!.id, "PAR-R1");
    const r = await redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: "k2" });
    expect(r.balance).toBe(0);
    expect(r.coupon.status).toBe("AVAILABLE");
    expect(r.coupon.pointsSpent).toBe(100);
  });

  it("ten sam klucz idempotencji zwraca ten sam kupon (podwójne kliknięcie)", async () => {
    const c = await createCustomer();
    const reward = await createReward({ pointsCost: 50 });
    await sale(c.card!.id, "PAR-R2");
    const results = await Promise.all([1, 2, 3].map(() => redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: "same-key" })));
    expect(new Set(results.map((r) => r.coupon.id)).size).toBe(1);
    expect(await prisma.coupon.count({ where: { cardId: c.card!.id } })).toBe(1);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(50);
  });

  it("równoległe wymiany z różnymi kluczami nie zejdą poniżej zera", async () => {
    const c = await createCustomer();
    const reward = await createReward({ pointsCost: 60 });
    await sale(c.card!.id, "PAR-R3"); // 100 pkt — wystarczy na jedną wymianę
    const settled = await Promise.allSettled([1, 2, 3, 4].map((i) => redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: `k-${i}` })));
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(40);
  });

  it("respektuje zapas i limit na klienta", async () => {
    const c = await createCustomer();
    await sale(c.card!.id, "PAR-R4", [item("A", "rosliny", 1, 100000)]);
    const limited = await createReward({ pointsCost: 10, perCustomerLimit: 1 });
    await redeemReward({ userId: c.id, rewardId: limited.id, idempotencyKey: "l1" });
    await expectCode(redeemReward({ userId: c.id, rewardId: limited.id, idempotencyKey: "l2" }), "LIMIT_REACHED");
    const stocked = await createReward({ pointsCost: 10, stock: 1 });
    await redeemReward({ userId: c.id, rewardId: stocked.id, idempotencyKey: "s1" });
    await expectCode(redeemReward({ userId: c.id, rewardId: stocked.id, idempotencyKey: "s2" }), "OUT_OF_STOCK");
  });
});

describe("kupony przy kasie", () => {
  async function customerWithCoupon() {
    const c = await createCustomer();
    await sale(c.card!.id, `PAR-C-${c.id}`);
    const reward = await createReward({ pointsCost: 100, valueGrosze: 500, minBasketGrosze: 2000 });
    const { coupon } = await redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: `c-${c.id}` });
    return { c, coupon };
  }

  it("równoległe próby użycia tego samego kuponu — skuteczna dokładnie jedna", async () => {
    const { c, coupon } = await customerWithCoupon();
    const settled = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) => redeemCoupon({ integrationId, externalTransactionId: `T-${i}`, code: coupon.code, cardId: c.card!.id, basketGrosze: 5000 })),
    );
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.couponRedemption.count({ where: { couponId: coupon.id, releasedAt: null } })).toBe(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).status).toBe("USED");
  });

  it("kupon nie zadziała z cudzą kartą, przy zbyt małym koszyku ani po wykorzystaniu", async () => {
    const { c, coupon } = await customerWithCoupon();
    const other = await createCustomer();
    await expectCode(validateCoupon({ code: coupon.code, cardId: other.card!.id, basketGrosze: 5000 }), "COUPON_INVALID");
    await expectCode(validateCoupon({ code: coupon.code, cardId: c.card!.id, basketGrosze: 1000 }), "BASKET_TOO_SMALL");
    await redeemCoupon({ integrationId, externalTransactionId: "T1", code: coupon.code, cardId: c.card!.id, basketGrosze: 5000 });
    await expectCode(redeemCoupon({ integrationId, externalTransactionId: "T2", code: coupon.code, cardId: c.card!.id, basketGrosze: 5000 }), "COUPON_ALREADY_USED");
  });

  it("zwolnienie przed zakończeniem sprzedaży przywraca kupon", async () => {
    const { c, coupon } = await customerWithCoupon();
    await redeemCoupon({ integrationId, externalTransactionId: "T-REL", code: coupon.code, cardId: c.card!.id, basketGrosze: 5000 });
    await releaseByPos({ integrationId, externalTransactionId: "T-REL", code: coupon.code });
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).status).toBe("AVAILABLE");
    const again = await redeemCoupon({ integrationId, externalTransactionId: "T-REL2", code: coupon.code, cardId: c.card!.id, basketGrosze: 5000 });
    expect(again.replayed).toBe(false);
  });

  it("wygasanie kuponów: status EXPIRED i brak możliwości użycia ani aktywacji", async () => {
    const { c, coupon } = await customerWithCoupon();
    await prisma.coupon.update({ where: { id: coupon.id }, data: { validFrom: new Date(Date.now() - 10 * 86400000), expiresAt: new Date(Date.now() - 1000) } });
    await expectCode(redeemCoupon({ integrationId, externalTransactionId: "T-EXP", code: coupon.code, cardId: c.card!.id, basketGrosze: 5000 }), "COUPON_EXPIRED");
    await expectCode(setCouponActivation(c.id, coupon.id, true), "COUPON_EXPIRED");
    expect(await expireCoupons()).toBe(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).status).toBe("EXPIRED");
  });

  it("klient może aktywować i dezaktywować własny kupon, ale nie cudzy", async () => {
    const { c, coupon } = await customerWithCoupon();
    expect((await setCouponActivation(c.id, coupon.id, true)).status).toBe("ACTIVATED");
    expect((await setCouponActivation(c.id, coupon.id, false)).status).toBe("AVAILABLE");
    const other = await createCustomer();
    await expectCode(setCouponActivation(other.id, coupon.id, true), "NOT_FOUND");
  });
});

describe("zwroty i anulowania", () => {
  it("zwroty częściowe korygują punkty proporcjonalnie, a pełny zwrot dokładnie do zera", async () => {
    const c = await createCustomer();
    await sale(c.card!.id, "PAR-Z", [item("A", "rosliny", 3, 3333), item("B", "nawozy", 1, 1)]); // 10000 gr → 100 pkt
    const r1 = await recordReturn({ integrationId, externalId: "ZWR-1", originalExternalId: "PAR-Z", items: [{ sku: "A", quantity: 1 }], occurredAt: new Date() });
    expect(r1.pointsReversed).toBe(33);
    const r2 = await recordReturn({ integrationId, externalId: "ZWR-2", originalExternalId: "PAR-Z", items: [{ sku: "A", quantity: 2 }, { sku: "B", quantity: 1 }], occurredAt: new Date() });
    expect(r1.pointsReversed + r2.pointsReversed).toBe(100);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(0);
    await expectCode(recordReturn({ integrationId, externalId: "ZWR-3", originalExternalId: "PAR-Z", items: [{ sku: "A", quantity: 1 }], occurredAt: new Date() }), "RETURN_EXCEEDS_SALE");
  });

  it("ponowne przesłanie zwrotu nie koryguje dwa razy", async () => {
    const c = await createCustomer();
    await sale(c.card!.id, "PAR-ZD");
    await recordReturn({ integrationId, externalId: "ZWR-D", originalExternalId: "PAR-ZD", items: [{ sku: "ROS-1", quantity: 1 }], occurredAt: new Date() });
    const again = await recordReturn({ integrationId, externalId: "ZWR-D", originalExternalId: "PAR-ZD", items: [{ sku: "ROS-1", quantity: 1 }], occurredAt: new Date() });
    expect(again.duplicate).toBe(true);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(50);
  });

  it("zwrot po wydaniu punktów może dać saldo ujemne (zgodnie z konfiguracją)", async () => {
    const c = await createCustomer();
    await sale(c.card!.id, "PAR-N");
    const reward = await createReward({ pointsCost: 100 });
    await redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: "n1" });
    await recordReturn({ integrationId, externalId: "ZWR-N", originalExternalId: "PAR-N", items: [{ sku: "ROS-1", quantity: 2 }], occurredAt: new Date() });
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(-100);
  });

  it("anulowanie cofa wszystkie punkty i zwalnia kupon użyty w transakcji", async () => {
    const c = await createCustomer();
    await sale(c.card!.id, "PAR-V0");
    const reward = await createReward({ pointsCost: 100 });
    const { coupon } = await redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: "v1" });
    await redeemCoupon({ integrationId, externalTransactionId: "PAR-V1", code: coupon.code, cardId: c.card!.id, basketGrosze: 10000 });
    await sale(c.card!.id, "PAR-V1", [item("ROS-1", "rosliny", 2, 5000, 500)]); // 95 pkt
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(95);
    const v = await voidSale({ integrationId, externalId: "PAR-V1", reason: "Błąd kasjera" });
    expect(v.pointsReversed).toBe(95);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(0);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).status).toBe("AVAILABLE");
    const again = await voidSale({ integrationId, externalId: "PAR-V1", reason: "Błąd kasjera" });
    expect(again.duplicate).toBe(true);
  });
});

describe("spójność salda i niezmienność rejestru", () => {
  it("saldo każdej karty równa się sumie rejestru po serii operacji", async () => {
    const customers = await Promise.all([1, 2, 3].map(() => createCustomer()));
    const reward = await createReward({ pointsCost: 30 });
    await Promise.all(customers.map((c, i) => sale(c.card!.id, `PAR-S-${i}`)));
    await Promise.allSettled(customers.flatMap((c) => [1, 2, 3, 4].map((k) => redeemReward({ userId: c.id, rewardId: reward.id, idempotencyKey: `s-${c.id}-${k}` }))));
    await recordReturn({ integrationId, externalId: "ZWR-S", originalExternalId: "PAR-S-0", items: [{ sku: "ROS-1", quantity: 1 }], occurredAt: new Date() });
    expect(await balanceIntegrityCheck()).toEqual([]);
    for (const c of customers) {
      const card = await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } });
      expect(card.pointsBalance).toBeGreaterThanOrEqual(-100);
    }
  });

  it("baza danych blokuje modyfikację i usuwanie wpisów rejestru oraz audytu", async () => {
    const c = await createCustomer();
    await sale(c.card!.id, "PAR-IMM");
    const entry = await prisma.pointsLedger.findFirstOrThrow({ where: { cardId: c.card!.id } });
    await expect(prisma.pointsLedger.update({ where: { id: entry.id }, data: { points: 99999 } })).rejects.toThrow();
    await expect(prisma.pointsLedger.delete({ where: { id: entry.id } })).rejects.toThrow();
    const log = await prisma.auditLog.create({ data: { actorLabel: "test", action: "test", entityType: "Test" } });
    await expect(prisma.auditLog.delete({ where: { id: log.id } })).rejects.toThrow();
  });
});
