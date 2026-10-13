import "server-only";
import type { Coupon, CouponStatus } from "@prisma/client";
import { prisma, withTx, type Db, type Tx } from "../db";
import { AppError, notFound } from "../errors";
import { audit } from "../audit";
import { calculateDiscount, type EarnItem } from "./calculator";
import { postLedgerEntry } from "./ledger";
import { notify } from "../services/notifications";

export const USABLE_STATUSES: CouponStatus[] = ["AVAILABLE", "ACTIVATED"];

/** Oznacza przeterminowane kupony jako wygasłe. Wywoływane leniwie przy odczycie oraz cyklicznie (scripts/run-jobs.ts). */
export async function expireCoupons(db: Db = prisma, now = new Date()): Promise<number> {
  const r = await db.coupon.updateMany({
    where: { status: { in: USABLE_STATUSES }, expiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  return r.count;
}

/** Status efektywny (na wypadek, gdyby zadanie wygaszania jeszcze nie przebiegło). */
export function effectiveStatus(c: Pick<Coupon, "status" | "expiresAt">, now = new Date()): CouponStatus {
  if (USABLE_STATUSES.includes(c.status) && c.expiresAt <= now) return "EXPIRED";
  return c.status;
}

export async function listCustomerCoupons(userId: string) {
  const card = await prisma.loyaltyCard.findUnique({ where: { userId }, select: { id: true } });
  if (!card) return { active: [], used: [], expired: [] };
  await expireCoupons(prisma);
  const coupons = await prisma.coupon.findMany({
    where: { cardId: card.id },
    orderBy: [{ expiresAt: "asc" }],
    include: { redemptions: { where: { releasedAt: null }, take: 1 } },
  });
  return {
    active: coupons.filter((c) => USABLE_STATUSES.includes(c.status)),
    used: coupons.filter((c) => c.status === "USED").sort((a, b) => +(b.usedAt ?? 0) - +(a.usedAt ?? 0)),
    expired: coupons.filter((c) => c.status === "EXPIRED" || c.status === "CANCELLED").sort((a, b) => +b.expiresAt - +a.expiresAt),
  };
}

/** Klient aktywuje kupon — kasa zastosuje go automatycznie po zeskanowaniu karty. */
export async function setCouponActivation(userId: string, couponId: string, activate: boolean, now = new Date()) {
  const coupon = await prisma.coupon.findFirst({ where: { id: couponId, card: { userId } } });
  if (!coupon) throw notFound("Kupon");
  if (effectiveStatus(coupon, now) === "EXPIRED") throw new AppError("COUPON_EXPIRED", "Ten kupon wygasł.");
  const from: CouponStatus = activate ? "AVAILABLE" : "ACTIVATED";
  const to: CouponStatus = activate ? "ACTIVATED" : "AVAILABLE";
  const r = await prisma.coupon.updateMany({
    where: { id: couponId, status: from, expiresAt: { gt: now } },
    data: { status: to, activatedAt: activate ? now : null },
  });
  if (r.count === 0 && coupon.status !== to) {
    throw new AppError("COUPON_INVALID", "Tego kuponu nie można już zmienić.");
  }
  return prisma.coupon.findUniqueOrThrow({ where: { id: couponId } });
}

function assertUsable(coupon: Coupon, now: Date) {
  const status = effectiveStatus(coupon, now);
  if (status === "USED") throw new AppError("COUPON_ALREADY_USED", "Kupon został już wykorzystany.");
  if (status === "EXPIRED") throw new AppError("COUPON_EXPIRED", "Kupon wygasł.");
  if (status === "CANCELLED") throw new AppError("COUPON_INVALID", "Kupon został anulowany.");
  if (coupon.validFrom > now) throw new AppError("COUPON_INVALID", "Kupon nie jest jeszcze ważny.");
}

async function findCouponForCard(db: Db, code: string, cardId: string) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  // Ten sam komunikat dla „nie istnieje” i „należy do innej karty” — bez ujawniania cudzych kuponów.
  if (!coupon || coupon.cardId !== cardId) throw new AppError("COUPON_INVALID", "Kupon nie istnieje lub nie należy do tej karty.");
  return coupon;
}

/** Walidacja kuponu przy kasie (bez zużycia). */
export async function validateCoupon(params: { code: string; cardId: string; basketGrosze: number; items?: EarnItem[]; now?: Date }) {
  const now = params.now ?? new Date();
  const coupon = await findCouponForCard(prisma, params.code, params.cardId);
  assertUsable(coupon, now);
  const result = calculateDiscount(coupon, params.basketGrosze, params.items);
  if (!result.ok) {
    throw new AppError("BASKET_TOO_SMALL", "Wartość koszyka jest za niska dla tego kuponu.", {
      minBasketGrosze: coupon.minBasketGrosze,
      eligibleGrosze: result.eligibleGrosze,
    });
  }
  return { coupon, discountGrosze: result.discountGrosze };
}

/**
 * Wykorzystanie kuponu przy kasie. Atomowe przejście statusu AVAILABLE/ACTIVATED → USED
 * (UPDATE ... WHERE status IN (...)) oraz częściowy indeks unikalny na aktywną realizację
 * gwarantują, że przy równoległych próbach kupon zostanie użyty dokładnie raz.
 */
export async function redeemCoupon(params: {
  integrationId: string;
  externalTransactionId: string;
  code: string;
  cardId: string;
  basketGrosze: number;
  items?: EarnItem[];
  now?: Date;
}) {
  const now = params.now ?? new Date();
  return withTx(async (tx) => {
    const coupon = await findCouponForCard(tx, params.code, params.cardId);
    // Idempotencja: ten sam kupon w tej samej transakcji POS — zwracamy istniejącą realizację.
    const existing = await tx.couponRedemption.findFirst({
      where: { couponId: coupon.id, releasedAt: null, integrationId: params.integrationId, externalTransactionId: params.externalTransactionId },
    });
    if (existing) return { redemption: existing, coupon, replayed: true };

    assertUsable(coupon, now);
    const calc = calculateDiscount(coupon, params.basketGrosze, params.items);
    if (!calc.ok) throw new AppError("BASKET_TOO_SMALL", "Wartość koszyka jest za niska dla tego kuponu.");

    const updated = await tx.coupon.updateMany({
      where: { id: coupon.id, status: { in: USABLE_STATUSES }, expiresAt: { gt: now } },
      data: { status: "USED", usedAt: now },
    });
    if (updated.count !== 1) throw new AppError("COUPON_ALREADY_USED", "Kupon został już wykorzystany.");

    const redemption = await tx.couponRedemption.create({
      data: {
        couponId: coupon.id,
        integrationId: params.integrationId,
        externalTransactionId: params.externalTransactionId,
        discountGrosze: calc.discountGrosze,
        basketGrosze: params.basketGrosze,
        redeemedAt: now,
      },
    });
    return { redemption, coupon: { ...coupon, status: "USED" as const, usedAt: now }, replayed: false };
  });
}

/** Zwolnienie realizacji (sprzedaż przerwana / anulowana) — kupon wraca do puli, jeśli nadal jest ważny. */
export async function releaseRedemption(tx: Tx, redemptionId: string, reason: string, now = new Date()) {
  const redemption = await tx.couponRedemption.findUnique({ where: { id: redemptionId }, include: { coupon: true } });
  if (!redemption) throw notFound("Realizacja kuponu");
  if (redemption.releasedAt) return redemption;
  await tx.couponRedemption.update({ where: { id: redemptionId }, data: { releasedAt: now, releaseReason: reason } });
  const backTo: CouponStatus = redemption.coupon.expiresAt > now ? "AVAILABLE" : "EXPIRED";
  await tx.coupon.updateMany({ where: { id: redemption.couponId, status: "USED" }, data: { status: backTo, usedAt: null } });
  return redemption;
}

/** Zwolnienie kuponu przez POS przed sfinalizowaniem sprzedaży. */
export async function releaseByPos(params: { integrationId: string; externalTransactionId: string; code: string; reason?: string }) {
  return withTx(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { code: params.code.trim().toUpperCase() } });
    if (!coupon) throw new AppError("COUPON_INVALID", "Kupon nie istnieje.");
    const redemption = await tx.couponRedemption.findFirst({
      where: {
        couponId: coupon.id,
        integrationId: params.integrationId,
        externalTransactionId: params.externalTransactionId,
        releasedAt: null,
      },
    });
    if (!redemption) throw new AppError("NOT_FOUND", "Brak aktywnej realizacji tego kuponu w tej transakcji.");
    if (redemption.transactionId) {
      throw new AppError("CONFLICT", "Transakcja została już zakończona — użyj anulowania transakcji.");
    }
    await releaseRedemption(tx, redemption.id, params.reason ?? "Sprzedaż przerwana na kasie");
    return { released: true, couponStatus: coupon.expiresAt > new Date() ? "AVAILABLE" : "EXPIRED" };
  });
}

/** Anulowanie kuponu przez obsługę, opcjonalnie ze zwrotem punktów. */
export async function cancelCoupon(params: {
  actor: { id: string; email: string };
  couponId: string;
  refundPoints: boolean;
  reason: string;
  ipHash?: string;
}) {
  return withTx(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { id: params.couponId }, include: { card: true } });
    if (!coupon) throw notFound("Kupon");
    const r = await tx.coupon.updateMany({
      where: { id: coupon.id, status: { in: USABLE_STATUSES } },
      data: { status: "CANCELLED" },
    });
    if (r.count !== 1) throw new AppError("CONFLICT", "Można anulować tylko kupon dostępny lub aktywowany.");
    if (params.refundPoints && coupon.pointsSpent > 0) {
      await postLedgerEntry(tx, {
        cardId: coupon.cardId,
        type: "REDEEM_REVERSAL",
        points: coupon.pointsSpent,
        reason: `Zwrot punktów za anulowany kupon „${coupon.title}”: ${params.reason}`,
        idempotencyKey: `coupon-cancel:${coupon.id}`,
        couponId: coupon.id,
        actorUserId: params.actor.id,
      });
    }
    await audit(tx, {
      actorUserId: params.actor.id,
      actorLabel: params.actor.email,
      action: "coupon.cancel",
      entityType: "Coupon",
      entityId: coupon.id,
      reason: params.reason,
      before: { status: coupon.status },
      after: { status: "CANCELLED", refundedPoints: params.refundPoints ? coupon.pointsSpent : 0 },
      ipHash: params.ipHash,
    });
    await notify(tx, coupon.card.userId, {
      category: "TRANSACTIONAL",
      title: "Kupon anulowany",
      body: params.refundPoints && coupon.pointsSpent > 0
        ? `Kupon „${coupon.title}” został anulowany, a ${coupon.pointsSpent} pkt wróciło na Twoje konto.`
        : `Kupon „${coupon.title}” został anulowany przez obsługę sklepu.`,
      link: "/kupony",
    });
  });
}
