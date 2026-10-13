import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { recordSale, recordReturn } from "@/server/loyalty/transactions";
import { redeemReward } from "@/server/loyalty/rewards";
import { redeemCoupon } from "@/server/loyalty/coupons";
import { getInternalIntegration } from "@/server/pos/integrations";
import { programReport, dashboardKpis } from "@/server/services/reports";
import { sendCampaignNotification } from "@/server/services/admin";
import { updateConsents } from "@/server/services/consents";
import { getSessionUser } from "@/server/auth/session";
import { createCustomer, createReward, createStaff, item, resetDb } from "../helpers/db";
import { tokenFor } from "../helpers/http";

beforeEach(resetDb);

describe("raporty", () => {
  it("zwracają poprawne wartości dla znanego zestawu danych", async () => {
    const { id: integrationId } = await getInternalIntegration();
    const [a, b] = await Promise.all([createCustomer(), createCustomer()]);
    const now = new Date();
    const sale = (cardId: string, externalId: string, grosze: number) =>
      recordSale({ integrationId, externalId, cardId, occurredAt: now, items: [item("A", "rosliny", 1, grosze)], totalGrosze: grosze });
    await sale(a.card!.id, "R1", 10000); // 100 pkt
    await sale(a.card!.id, "R2", 20000); // 200 pkt
    await sale(b.card!.id, "R3", 30000); // 300 pkt
    await recordReturn({ integrationId, externalId: "R3-Z", originalExternalId: "R3", items: [{ sku: "A", quantity: 1 }], occurredAt: now });
    const reward = await createReward({ pointsCost: 100, valueGrosze: 500, minBasketGrosze: 0 });
    const { coupon } = await redeemReward({ userId: a.id, rewardId: reward.id, idempotencyKey: "rep" });
    await redeemCoupon({ integrationId, externalTransactionId: "R4", code: coupon.code, cardId: a.card!.id, basketGrosze: 3000 });

    const r = await programReport({ from: new Date(now.getTime() - 86400000), to: new Date(now.getTime() + 86400000) });
    expect(r.registrations.total).toBe(2);
    expect(r.activity).toMatchObject({ salesCount: 3, salesValueGrosze: 60000, avgBasketGrosze: 20000, activeCustomers: 2, avgPurchasesPerCustomer: 1.5, returnsCount: 1, returnsValueGrosze: 30000 });
    expect(r.activity.frequency).toEqual([{ bucket: "1", customers: 1 }, { bucket: "2–3", customers: 1 }]);
    expect(r.points).toMatchObject({ issued: 600, reversed: 300, redeemed: 100, outstanding: 200 });
    expect(r.rewards[0]).toMatchObject({ name: reward.name, redeemed: 1, used: 1, pointsSpent: 100 });
    expect(r.cost.couponDiscountsGrosze).toBe(500);
    const k = await dashboardKpis();
    expect(k).toMatchObject({ customers: 2, salesCount: 3, pointsIssued: 600, pointsRedeemed: 100, couponsUsed: 1 });
  });
});

describe("komunikaty marketingowe", () => {
  it("powiadomienie kampanii trafia wyłącznie do klientów ze zgodą", async () => {
    const [yes, no] = await Promise.all([createCustomer(), createCustomer()]);
    await updateConsents(prisma, yes.id, { MARKETING_PUSH: true }, { source: "test" });
    await updateConsents(prisma, no.id, { MARKETING_PUSH: false }, { source: "test" });
    const campaign = await prisma.campaign.create({ data: { name: "Test", description: "Opis", type: "SEASONAL_OFFER", startsAt: new Date(), endsAt: new Date(Date.now() + 86400000) } });
    const admin = await getSessionUser(await tokenFor(await createStaff("ADMIN")));
    const r = await sendCampaignNotification(admin!, campaign.id, "test");
    expect(r.recipients).toBe(1);
    expect(await prisma.notification.count({ where: { userId: yes.id, category: "MARKETING" } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: no.id, category: "MARKETING" } })).toBe(0);
  });
});
