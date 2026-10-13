import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getActiveConfig } from "../loyalty/config";

const n = (v: unknown) => (typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0));

/** Kluczowe wskaźniki na pulpit (ostatnie 30 dni). */
export async function dashboardKpis(now = new Date()) {
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [customers, newCustomers, activeRows, issued, redeemed, couponsUsed, sales, openComplaints, posErrors] = await Promise.all([
    prisma.user.count({ where: { kind: "CUSTOMER", status: "ACTIVE" } }),
    prisma.user.count({ where: { kind: "CUSTOMER", createdAt: { gte: since } } }),
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT "cardId") AS c FROM "Transaction"
      WHERE "type" = 'SALE' AND "status" = 'COMPLETED' AND "occurredAt" >= ${since}`,
    prisma.pointsLedger.aggregate({ where: { type: { in: ["EARN", "BONUS"] }, createdAt: { gte: since } }, _sum: { points: true } }),
    prisma.pointsLedger.aggregate({ where: { type: "REDEEM", createdAt: { gte: since } }, _sum: { points: true } }),
    prisma.couponRedemption.count({ where: { releasedAt: null, redeemedAt: { gte: since } } }),
    prisma.transaction.aggregate({
      where: { type: "SALE", status: "COMPLETED", occurredAt: { gte: since } },
      _sum: { totalGrosze: true },
      _count: true,
    }),
    prisma.complaint.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.posRequestLog.count({ where: { status: { gte: 400 }, createdAt: { gte: since } } }),
  ]);
  const salesCount = sales._count;
  const salesValue = sales._sum.totalGrosze ?? 0;
  return {
    customers,
    newCustomers,
    activeCustomers: n(activeRows[0]?.c),
    pointsIssued: issued._sum.points ?? 0,
    pointsRedeemed: -(redeemed._sum.points ?? 0),
    couponsUsed,
    salesCount,
    salesValueGrosze: salesValue,
    avgBasketGrosze: salesCount ? Math.round(salesValue / salesCount) : 0,
    openComplaints,
    posErrors,
  };
}

export interface ReportRange {
  from: Date;
  to: Date; // wyłącznie
}

/** Raport programu za okres. Wszystkie kwoty w groszach, punkty jako liczby całkowite. */
export async function programReport(range: ReportRange) {
  const { from, to } = range;
  const config = await getActiveConfig(prisma);

  const registrations = await prisma.$queryRaw<{ week: Date; count: bigint }[]>`
    SELECT date_trunc('week', "createdAt" AT TIME ZONE 'Europe/Warsaw') AS week, COUNT(*) AS count
    FROM "User" WHERE "kind" = 'CUSTOMER' AND "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY 1 ORDER BY 1`;

  const salesAgg = await prisma.$queryRaw<{ count: bigint; value: bigint | null; customers: bigint }[]>`
    SELECT COUNT(*) AS count, SUM("totalGrosze") AS value, COUNT(DISTINCT "cardId") AS customers
    FROM "Transaction" WHERE "type" = 'SALE' AND "status" = 'COMPLETED' AND "occurredAt" >= ${from} AND "occurredAt" < ${to}`;
  const returnsAgg = await prisma.$queryRaw<{ count: bigint; value: bigint | null }[]>`
    SELECT COUNT(*) AS count, SUM("totalGrosze") AS value
    FROM "Transaction" WHERE "type" = 'RETURN' AND "occurredAt" >= ${from} AND "occurredAt" < ${to}`;
  const voided = await prisma.transaction.count({ where: { type: "SALE", status: "VOIDED", occurredAt: { gte: from, lt: to } } });

  const frequency = await prisma.$queryRaw<{ bucket: string; customers: bigint }[]>`
    SELECT CASE WHEN c = 1 THEN '1' WHEN c <= 3 THEN '2–3' WHEN c <= 6 THEN '4–6' ELSE '7+' END AS bucket, COUNT(*) AS customers
    FROM (
      SELECT "cardId", COUNT(*) AS c FROM "Transaction"
      WHERE "type" = 'SALE' AND "status" = 'COMPLETED' AND "occurredAt" >= ${from} AND "occurredAt" < ${to}
      GROUP BY "cardId"
    ) t GROUP BY 1 ORDER BY MIN(c)`;

  const monthly = await prisma.$queryRaw<{ month: Date; count: bigint; value: bigint }[]>`
    SELECT date_trunc('month', "occurredAt" AT TIME ZONE 'Europe/Warsaw') AS month, COUNT(*) AS count, SUM("totalGrosze") AS value
    FROM "Transaction" WHERE "type" = 'SALE' AND "status" = 'COMPLETED' AND "occurredAt" >= ${from} AND "occurredAt" < ${to}
    GROUP BY 1 ORDER BY 1`;

  const ledger = await prisma.pointsLedger.groupBy({
    by: ["type"],
    where: { createdAt: { gte: from, lt: to } },
    _sum: { points: true },
    _count: true,
  });
  const byType = Object.fromEntries(ledger.map((l) => [l.type, { points: l._sum.points ?? 0, count: l._count }]));
  const pts = (t: string) => (byType[t]?.points as number | undefined) ?? 0;

  const rewards = await prisma.$queryRaw<{ id: string; name: string; redeemed: bigint; used: bigint; points: bigint | null }[]>(Prisma.sql`
    SELECT r."id", r."name",
      COUNT(c."id") FILTER (WHERE c."createdAt" >= ${from} AND c."createdAt" < ${to} AND c."status" <> 'CANCELLED') AS redeemed,
      COUNT(c."id") FILTER (WHERE c."usedAt" >= ${from} AND c."usedAt" < ${to} AND c."status" = 'USED') AS used,
      SUM(c."pointsSpent") FILTER (WHERE c."createdAt" >= ${from} AND c."createdAt" < ${to} AND c."status" <> 'CANCELLED') AS points
    FROM "Reward" r LEFT JOIN "Coupon" c ON c."rewardId" = r."id"
    GROUP BY r."id", r."name" ORDER BY redeemed DESC, r."name"`);

  const discounts = await prisma.couponRedemption.aggregate({
    where: { releasedAt: null, redeemedAt: { gte: from, lt: to } },
    _sum: { discountGrosze: true },
    _count: true,
  });
  const liability = await prisma.loyaltyCard.aggregate({ where: { pointsBalance: { gt: 0 }, status: "ACTIVE" }, _sum: { pointsBalance: true } });

  const salesCount = n(salesAgg[0]?.count);
  const salesValue = n(salesAgg[0]?.value);
  const activeCustomers = n(salesAgg[0]?.customers);
  const pointsIssued = pts("EARN") + pts("BONUS");
  const outstanding = liability._sum.pointsBalance ?? 0;

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    registrations: {
      total: registrations.reduce((s, r) => s + n(r.count), 0),
      byWeek: registrations.map((r) => ({ week: r.week.toISOString().slice(0, 10), count: n(r.count) })),
    },
    activity: {
      activeCustomers,
      salesCount,
      salesValueGrosze: salesValue,
      avgBasketGrosze: salesCount ? Math.round(salesValue / salesCount) : 0,
      avgPurchasesPerCustomer: activeCustomers ? Math.round((salesCount / activeCustomers) * 100) / 100 : 0,
      returnsCount: n(returnsAgg[0]?.count),
      returnsValueGrosze: n(returnsAgg[0]?.value),
      voidedCount: voided,
      frequency: frequency.map((f) => ({ bucket: f.bucket, customers: n(f.customers) })),
      monthly: monthly.map((m) => ({
        month: m.month.toISOString().slice(0, 7),
        count: n(m.count),
        valueGrosze: n(m.value),
        avgBasketGrosze: n(m.count) ? Math.round(n(m.value) / n(m.count)) : 0,
      })),
    },
    points: {
      issued: pointsIssued,
      reversed: -(pts("RETURN_REVERSAL") + pts("VOID_REVERSAL")),
      redeemed: -pts("REDEEM"),
      redeemReversed: pts("REDEEM_REVERSAL"),
      adjustmentsNet: pts("ADJUSTMENT"),
      outstanding,
    },
    rewards: rewards.map((r) => ({ id: r.id, name: r.name, redeemed: n(r.redeemed), used: n(r.used), pointsSpent: n(r.points) })),
    cost: {
      couponDiscountsGrosze: discounts._sum.discountGrosze ?? 0,
      couponsUsed: discounts._count,
      // Szacunek na podstawie informacyjnej wartości punktu z konfiguracji (nie jest to wartość księgowa).
      pointValueGrosze: config.pointValueGroszeInfo,
      issuedValueEstimateGrosze: pointsIssued * config.pointValueGroszeInfo,
      liabilityEstimateGrosze: outstanding * config.pointValueGroszeInfo,
    },
  };
}

export type ProgramReport = Awaited<ReturnType<typeof programReport>>;

/** Spójność salda: saldo każdej karty = suma jej wpisów w rejestrze. Zwraca karty niespójne (powinna być pusta lista). */
export async function balanceIntegrityCheck() {
  return prisma.$queryRaw<{ id: string; number: string; balance: number; ledger: bigint }[]>`
    SELECT c."id", c."number", c."pointsBalance" AS balance, COALESCE(SUM(l."points"), 0) AS ledger
    FROM "LoyaltyCard" c LEFT JOIN "PointsLedger" l ON l."cardId" = c."id"
    GROUP BY c."id" HAVING c."pointsBalance" <> COALESCE(SUM(l."points"), 0)`;
}
