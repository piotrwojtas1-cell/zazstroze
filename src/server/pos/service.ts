import "server-only";
import { prisma } from "../db";
import { AppError } from "../errors";
import { parseCardCode } from "./card-qr";
import { expireCoupons, validateCoupon, redeemCoupon, releaseByPos, USABLE_STATUSES } from "../loyalty/coupons";
import { recordSale, recordReturn, voidSale } from "../loyalty/transactions";
import type { NormalizedCouponRequest, NormalizedReturn, NormalizedSale, NormalizedVoid } from "./adapter";

/**
 * Operacje kasowe niezależne od transportu — wywoływane przez API POS (podpisane HMAC)
 * oraz przez kasę demonstracyjną w panelu (sesja pracownika z uprawnieniem pos.operate).
 */
export async function resolveCard(code: string) {
  const parsed = parseCardCode(code);
  if (!parsed.ok) {
    throw parsed.reason === "EXPIRED"
      ? new AppError("QR_EXPIRED", "Kod QR wygasł — poproś klienta o odświeżenie karty w aplikacji.")
      : new AppError("CARD_NOT_FOUND", "Nieprawidłowy kod karty.");
  }
  const card = await prisma.loyaltyCard.findUnique({
    where: { number: parsed.cardNumber },
    include: { user: { include: { profile: true } }, tier: true },
  });
  if (!card) throw new AppError("CARD_NOT_FOUND", "Nie znaleziono karty.");
  if (card.status !== "ACTIVE") throw new AppError("CARD_INACTIVE", "Karta jest zablokowana lub zamknięta.");
  return { card, method: parsed.method };
}

/** Identyfikacja klienta — zwraca tylko dane niezbędne kasjerowi (imię + inicjał, bez e-maila i telefonu). */
export async function identify(code: string) {
  const { card, method } = await resolveCard(code);
  await expireCoupons(prisma);
  const coupons = await prisma.coupon.findMany({
    where: { cardId: card.id, status: { in: USABLE_STATUSES } },
    orderBy: { expiresAt: "asc" },
  });
  const p = card.user.profile;
  return {
    cardNumber: card.number,
    method,
    customerName: p ? `${p.firstName}${p.lastName ? ` ${p.lastName[0]}.` : ""}` : "Klient",
    tier: card.tier ? { key: card.tier.key, name: card.tier.name } : null,
    pointsBalance: card.pointsBalance,
    coupons: coupons.map((c) => ({
      code: c.code,
      title: c.title,
      type: c.type,
      valueGrosze: c.valueGrosze,
      percentBp: c.percentBp,
      minBasketGrosze: c.minBasketGrosze,
      excludedCategories: c.excludedCategories,
      expiresAt: c.expiresAt.toISOString(),
      autoApply: c.status === "ACTIVATED",
    })),
  };
}

export async function couponValidate(req: NormalizedCouponRequest) {
  const { card } = await resolveCard(req.cardCode);
  const { coupon, discountGrosze } = await validateCoupon({ code: req.code, cardId: card.id, basketGrosze: req.basketGrosze, items: req.items });
  return { valid: true, couponCode: coupon.code, title: coupon.title, discountGrosze };
}

export async function couponRedeem(integrationId: string, req: NormalizedCouponRequest) {
  const { card } = await resolveCard(req.cardCode);
  const r = await redeemCoupon({
    integrationId,
    externalTransactionId: req.externalTransactionId,
    code: req.code,
    cardId: card.id,
    basketGrosze: req.basketGrosze,
    items: req.items,
  });
  return { redemptionId: r.redemption.id, couponCode: r.coupon.code, discountGrosze: r.redemption.discountGrosze, replayed: r.replayed };
}

export async function couponRelease(integrationId: string, req: { code: string; externalTransactionId: string; reason?: string }) {
  return releaseByPos({ integrationId, code: req.code, externalTransactionId: req.externalTransactionId, reason: req.reason });
}

export async function sale(integrationId: string, req: NormalizedSale) {
  const { card } = await resolveCard(req.code);
  const r = await recordSale({
    integrationId,
    externalId: req.externalId,
    cardId: card.id,
    storeCode: req.storeCode,
    occurredAt: req.occurredAt,
    totalGrosze: req.totalGrosze,
    items: req.items,
  });
  return {
    transactionId: r.transaction.id,
    externalId: r.transaction.externalId,
    pointsAwarded: r.pointsAwarded,
    pointsBalance: r.balance,
    duplicate: r.duplicate,
  };
}

export async function saleReturn(integrationId: string, req: NormalizedReturn) {
  const r = await recordReturn({ integrationId, ...req });
  return {
    transactionId: r.transaction.id,
    externalId: r.transaction.externalId,
    refundGrosze: r.transaction.totalGrosze,
    pointsReversed: r.pointsReversed,
    pointsBalance: r.balance,
    duplicate: r.duplicate,
  };
}

export async function saleVoid(integrationId: string, req: NormalizedVoid, actorUserId?: string) {
  const r = await voidSale({ integrationId, externalId: req.externalId, reason: req.reason, actorUserId });
  return { externalId: req.externalId, status: "VOIDED", pointsReversed: r.pointsReversed, pointsBalance: r.balance, duplicate: r.duplicate };
}
