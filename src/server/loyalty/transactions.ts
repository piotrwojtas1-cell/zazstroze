import "server-only";
import type { Prisma, Transaction } from "@prisma/client";
import { prisma, withTx, isUniqueViolation, type Tx } from "../db";
import { AppError } from "../errors";
import { calculateEarn, isQualifying, returnReversal, returnedValue, type EarnCampaign } from "./calculator";
import { getActiveConfig, MAX_CLOCK_SKEW_MS, MAX_TRANSACTION_AGE_DAYS } from "./config";
import { lockCard, postLedgerEntry } from "./ledger";
import { recomputeTier } from "./tiers";
import { releaseRedemption } from "./coupons";
import { notify } from "../services/notifications";
import { formatPLN } from "@/lib/money";

export interface SaleItemInput {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPriceGrosze: number;
  discountGrosze: number;
}

export interface SaleInput {
  integrationId: string;
  externalId: string;
  cardId: string;
  storeCode?: string;
  occurredAt: Date;
  items: SaleItemInput[];
  totalGrosze: number;
  /** Tylko dla seeda/migracji danych historycznych — pomija limit wieku transakcji. */
  allowBackdate?: boolean;
}

export interface SaleResult {
  transaction: Transaction;
  pointsAwarded: number;
  balance: number;
  duplicate: boolean;
}

function lineTotal(i: SaleItemInput) {
  return i.quantity * i.unitPriceGrosze - i.discountGrosze;
}

function validateSale(input: SaleInput, now: Date) {
  if (input.items.length === 0) throw new AppError("VALIDATION_ERROR", "Transakcja musi zawierać co najmniej jedną pozycję.");
  for (const i of input.items) {
    if (lineTotal(i) < 0) throw new AppError("VALIDATION_ERROR", `Rabat pozycji ${i.sku} przekracza jej wartość.`);
  }
  const sum = input.items.reduce((s, i) => s + lineTotal(i), 0);
  if (sum !== input.totalGrosze) {
    throw new AppError("TRANSACTION_MISMATCH", "Suma pozycji nie zgadza się z wartością transakcji.", {
      itemsTotalGrosze: sum,
      totalGrosze: input.totalGrosze,
    });
  }
  if (input.occurredAt.getTime() > now.getTime() + MAX_CLOCK_SKEW_MS) {
    throw new AppError("VALIDATION_ERROR", "Data transakcji jest w przyszłości.");
  }
  if (!input.allowBackdate && now.getTime() - input.occurredAt.getTime() > MAX_TRANSACTION_AGE_DAYS * 86_400_000) {
    throw new AppError("VALIDATION_ERROR", `Transakcja jest starsza niż ${MAX_TRANSACTION_AGE_DAYS} dni — wymaga korekty ręcznej.`);
  }
}

async function activeCampaigns(tx: Tx, at: Date): Promise<EarnCampaign[]> {
  return tx.campaign.findMany({
    where: { active: true, type: { in: ["POINTS_MULTIPLIER", "BONUS_POINTS"] }, startsAt: { lte: at }, endsAt: { gt: at } },
    select: { id: true, name: true, type: true, multiplierBp: true, bonusPoints: true, minBasketGrosze: true, categories: true, tierKeys: true },
  });
}

async function existingSaleResult(integrationId: string, externalId: string): Promise<SaleResult | null> {
  const t = await prisma.transaction.findUnique({ where: { integrationId_externalId: { integrationId, externalId } }, include: { card: true } });
  if (!t) return null;
  return { transaction: t, pointsAwarded: t.pointsAwarded, balance: t.card.pointsBalance, duplicate: true };
}

/**
 * Rejestruje zakończoną sprzedaż i nalicza punkty dokładnie raz.
 * Idempotencja: unikalność (integrationId, externalId) — ponowne przesłanie zwraca pierwotny wynik.
 */
export async function recordSale(input: SaleInput, now = new Date()): Promise<SaleResult> {
  validateSale(input, now);
  const prior = await existingSaleResult(input.integrationId, input.externalId);
  if (prior) {
    if (prior.transaction.cardId !== input.cardId || prior.transaction.type !== "SALE") {
      throw new AppError("CONFLICT", "Identyfikator transakcji został już użyty dla innej operacji.");
    }
    return prior;
  }

  try {
    return await withTx(async (tx) => {
      const card = await lockCard(tx, input.cardId);
      if (card.status !== "ACTIVE") throw new AppError("CARD_INACTIVE", "Karta jest zablokowana lub zamknięta.");

      const config = await getActiveConfig(tx);
      const tier = card.tierId ? await tx.tier.findUnique({ where: { id: card.tierId } }) : null;
      const campaigns = await activeCampaigns(tx, input.occurredAt);
      const store = input.storeCode ? await tx.store.findUnique({ where: { code: input.storeCode } }) : null;

      const items = input.items.map((i) => ({ ...i, totalGrosze: lineTotal(i) }));
      const calc = calculateEarn({
        items,
        config: { ...config, rounding: config.rounding },
        tier: tier ? { key: tier.key, name: tier.name, multiplierBp: tier.multiplierBp } : null,
        campaigns,
      });

      const transaction = await tx.transaction.create({
        data: {
          integrationId: input.integrationId,
          externalId: input.externalId,
          cardId: input.cardId,
          storeId: store?.id,
          type: "SALE",
          totalGrosze: input.totalGrosze,
          qualifyingGrosze: calc.qualifyingGrosze,
          discountGrosze: input.items.reduce((s, i) => s + i.discountGrosze, 0),
          pointsAwarded: calc.total,
          occurredAt: input.occurredAt,
          calculation: { ...calc, configVersion: config.version } as unknown as Prisma.InputJsonValue,
          items: {
            create: items.map((i) => ({
              sku: i.sku,
              name: i.name,
              category: i.category,
              quantity: i.quantity,
              unitPriceGrosze: i.unitPriceGrosze,
              discountGrosze: i.discountGrosze,
              totalGrosze: i.totalGrosze,
              qualifying: isQualifying(i.category, config.excludedCategories),
            })),
          },
        },
      });

      // Powiązanie kuponów wykorzystanych w tej transakcji POS.
      await tx.couponRedemption.updateMany({
        where: { integrationId: input.integrationId, externalTransactionId: input.externalId, releasedAt: null, transactionId: null },
        data: { transactionId: transaction.id },
      });

      let balance = card.pointsBalance;
      const basePlusTier = calc.basePoints + calc.tierBonus;
      if (basePlusTier > 0) {
        const e = await postLedgerEntry(tx, {
          cardId: input.cardId,
          type: "EARN",
          points: basePlusTier,
          reason: `Zakupy ${formatPLN(input.totalGrosze)}`,
          idempotencyKey: `sale:${transaction.id}:earn`,
          transactionId: transaction.id,
          createdAt: input.allowBackdate ? input.occurredAt : undefined,
        });
        balance = e.balanceAfter;
      }
      for (const bonus of [calc.campaignMultiplier, calc.campaignBonus]) {
        if (!bonus || bonus.points <= 0) continue;
        const e = await postLedgerEntry(tx, {
          cardId: input.cardId,
          type: "BONUS",
          points: bonus.points,
          reason: `Bonus kampanii „${bonus.name}”`,
          idempotencyKey: `sale:${transaction.id}:bonus:${bonus.campaignId}`,
          transactionId: transaction.id,
          campaignId: bonus.campaignId,
          createdAt: input.allowBackdate ? input.occurredAt : undefined,
        });
        balance = e.balanceAfter;
      }

      await recomputeTier(tx, input.cardId);
      const owner = await tx.loyaltyCard.findUniqueOrThrow({ where: { id: input.cardId }, select: { userId: true } });
      if (calc.total > 0 && !input.allowBackdate) {
        await notify(tx, owner.userId, {
          category: "TRANSACTIONAL",
          title: `+${calc.total} pkt za zakupy`,
          body: `Dziękujemy za zakupy o wartości ${formatPLN(input.totalGrosze)}. Saldo: ${balance} pkt.`,
          link: `/historia/${transaction.id}`,
        });
      }
      return { transaction, pointsAwarded: calc.total, balance, duplicate: false };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await existingSaleResult(input.integrationId, input.externalId);
      if (again) return again;
    }
    throw error;
  }
}

export interface ReturnInput {
  integrationId: string;
  externalId: string;
  originalExternalId: string;
  items: { sku: string; quantity: number }[];
  occurredAt: Date;
  reason?: string;
}

/**
 * Zwrot (częściowy lub całkowity) do wcześniejszej sprzedaży. Punkty korygowane proporcjonalnie, kumulatywnie.
 * Blokada wiersza sprzedaży serializuje równoległe zwroty do tego samego paragonu.
 */
export async function recordReturn(input: ReturnInput, now = new Date()) {
  if (input.items.length === 0) throw new AppError("VALIDATION_ERROR", "Zwrot musi zawierać co najmniej jedną pozycję.");
  if (input.occurredAt.getTime() > now.getTime() + MAX_CLOCK_SKEW_MS) throw new AppError("VALIDATION_ERROR", "Data zwrotu jest w przyszłości.");

  const prior = await prisma.transaction.findUnique({
    where: { integrationId_externalId: { integrationId: input.integrationId, externalId: input.externalId } },
    include: { card: true },
  });
  if (prior) {
    if (prior.type !== "RETURN") throw new AppError("CONFLICT", "Identyfikator transakcji został już użyty dla innej operacji.");
    return { transaction: prior, pointsReversed: -prior.pointsAwarded, balance: prior.card.pointsBalance, duplicate: true };
  }

  try {
    return await withTx(async (tx) => {
      const originalRef = await tx.transaction.findUnique({
        where: { integrationId_externalId: { integrationId: input.integrationId, externalId: input.originalExternalId } },
      });
      if (!originalRef || originalRef.type !== "SALE") throw new AppError("TRANSACTION_NOT_FOUND", "Nie znaleziono pierwotnej sprzedaży.");
      await tx.$queryRaw`SELECT "id" FROM "Transaction" WHERE "id" = ${originalRef.id} FOR UPDATE`;
      const original = await tx.transaction.findUniqueOrThrow({ where: { id: originalRef.id }, include: { items: true } });
      if (original.status === "VOIDED") throw new AppError("CONFLICT", "Sprzedaż została anulowana — zwrot nie jest możliwy.");

      const config = await getActiveConfig(tx);
      const returnLines: Prisma.TransactionItemCreateWithoutTransactionInput[] = [];
      let refundGrosze = 0;
      let refundQualifying = 0;

      // Agregacja ilości zwracanych dla tego samego SKU.
      const requested = new Map<string, number>();
      for (const r of input.items) requested.set(r.sku, (requested.get(r.sku) ?? 0) + r.quantity);

      for (const [sku, qty] of requested) {
        let remaining = qty;
        for (const item of original.items.filter((i) => i.sku === sku)) {
          if (remaining <= 0) break;
          const available = item.quantity - item.returnedQuantity;
          if (available <= 0) continue;
          const take = Math.min(available, remaining);
          const before = returnedValue(item.totalGrosze, item.quantity, item.returnedQuantity);
          const after = returnedValue(item.totalGrosze, item.quantity, item.returnedQuantity + take);
          const value = after - before;
          await tx.transactionItem.update({ where: { id: item.id }, data: { returnedQuantity: { increment: take } } });
          item.returnedQuantity += take;
          refundGrosze += value;
          if (item.qualifying) refundQualifying += value;
          returnLines.push({
            sku: item.sku,
            name: item.name,
            category: item.category,
            quantity: take,
            unitPriceGrosze: item.unitPriceGrosze,
            discountGrosze: Math.max(0, take * item.unitPriceGrosze - value),
            totalGrosze: value,
            qualifying: item.qualifying,
          });
          remaining -= take;
        }
        if (remaining > 0) {
          throw new AppError("RETURN_EXCEEDS_SALE", `Ilość zwracana dla ${sku} przekracza ilość sprzedaną (lub już zwróconą).`);
        }
      }

      const cumulativeReturnedQualifying = original.items
        .filter((i) => i.qualifying)
        .reduce((s, i) => s + returnedValue(i.totalGrosze, i.quantity, i.returnedQuantity), 0);
      const previousReturns = await tx.transaction.aggregate({
        where: { originalTransactionId: original.id, type: "RETURN" },
        _sum: { pointsAwarded: true },
      });
      const alreadyReversed = -(previousReturns._sum.pointsAwarded ?? 0);
      const reversal = returnReversal({
        pointsAwarded: original.pointsAwarded,
        originalQualifyingGrosze: original.qualifyingGrosze,
        cumulativeReturnedQualifyingGrosze: cumulativeReturnedQualifying,
        alreadyReversed,
      });

      const card = await lockCard(tx, original.cardId);
      let applied = reversal;
      if (!config.allowNegativeBalance) applied = Math.min(reversal, Math.max(0, card.pointsBalance));

      const transaction = await tx.transaction.create({
        data: {
          integrationId: input.integrationId,
          externalId: input.externalId,
          cardId: original.cardId,
          storeId: original.storeId,
          type: "RETURN",
          totalGrosze: refundGrosze,
          qualifyingGrosze: refundQualifying,
          pointsAwarded: -reversal,
          originalTransactionId: original.id,
          occurredAt: input.occurredAt,
          calculation: { reversal, applied, cumulativeReturnedQualifying, alreadyReversed, reason: input.reason ?? null },
          items: { create: returnLines },
        },
      });

      let balance = card.pointsBalance;
      if (applied > 0) {
        const e = await postLedgerEntry(tx, {
          cardId: original.cardId,
          type: "RETURN_REVERSAL",
          points: -applied,
          reason: `Korekta po zwrocie towaru (paragon ${original.externalId})`,
          idempotencyKey: `return:${transaction.id}`,
          transactionId: transaction.id,
          allowNegative: config.allowNegativeBalance,
          metadata: applied !== reversal ? { uncollected: reversal - applied } : undefined,
        });
        balance = e.balanceAfter;
      }
      await recomputeTier(tx, original.cardId);
      const owner = await tx.loyaltyCard.findUniqueOrThrow({ where: { id: original.cardId }, select: { userId: true } });
      await notify(tx, owner.userId, {
        category: "TRANSACTIONAL",
        title: "Zwrot towaru zarejestrowany",
        body:
          applied > 0
            ? `Zwrot o wartości ${formatPLN(refundGrosze)} — odjęliśmy ${applied} pkt naliczonych za zwrócone produkty.`
            : `Zwrot o wartości ${formatPLN(refundGrosze)} został zarejestrowany.`,
        link: `/historia/${transaction.id}`,
      });
      return { transaction, pointsReversed: applied, balance, duplicate: false };
    });
  } catch (error) {
    if (isUniqueViolation(error, "externalId")) {
      const t = await prisma.transaction.findUnique({
        where: { integrationId_externalId: { integrationId: input.integrationId, externalId: input.externalId } },
        include: { card: true },
      });
      if (t) return { transaction: t, pointsReversed: -t.pointsAwarded, balance: t.card.pointsBalance, duplicate: true };
    }
    throw error;
  }
}

/**
 * Anulowanie (storno) sprzedaży — np. błąd kasjera tuż po zakończeniu. Cofnięcie wszystkich punktów
 * i zwolnienie kuponów. Niedozwolone, gdy do sprzedaży istnieją zwroty (wtedy należy użyć zwrotu).
 */
export async function voidSale(params: { integrationId: string; externalId: string; reason: string; actorUserId?: string }, now = new Date()) {
  return withTx(async (tx) => {
    const ref = await tx.transaction.findUnique({
      where: { integrationId_externalId: { integrationId: params.integrationId, externalId: params.externalId } },
    });
    if (!ref || ref.type !== "SALE") throw new AppError("TRANSACTION_NOT_FOUND", "Nie znaleziono sprzedaży.");
    await tx.$queryRaw`SELECT "id" FROM "Transaction" WHERE "id" = ${ref.id} FOR UPDATE`;
    const sale = await tx.transaction.findUniqueOrThrow({ where: { id: ref.id }, include: { returns: true, redemptions: true, card: true } });
    if (sale.status === "VOIDED") return { transaction: sale, pointsReversed: 0, balance: sale.card.pointsBalance, duplicate: true };
    if (sale.returns.length > 0) throw new AppError("CONFLICT", "Do tej sprzedaży zarejestrowano zwrot — anulowanie jest niemożliwe.");

    await tx.transaction.update({ where: { id: sale.id }, data: { status: "VOIDED", voidedAt: now, voidReason: params.reason } });
    let balance = sale.card.pointsBalance;
    if (sale.pointsAwarded > 0) {
      const e = await postLedgerEntry(tx, {
        cardId: sale.cardId,
        type: "VOID_REVERSAL",
        points: -sale.pointsAwarded,
        reason: `Anulowanie transakcji ${sale.externalId}: ${params.reason}`,
        idempotencyKey: `void:${sale.id}`,
        transactionId: sale.id,
        actorUserId: params.actorUserId,
        allowNegative: true,
      });
      balance = e.balanceAfter;
    }
    for (const r of sale.redemptions.filter((r) => !r.releasedAt)) {
      await releaseRedemption(tx, r.id, "Anulowanie transakcji", now);
    }
    await recomputeTier(tx, sale.cardId);
    await notify(tx, sale.card.userId, {
      category: "TRANSACTIONAL",
      title: "Transakcja anulowana",
      body: `Transakcja ${sale.externalId} została anulowana przez sklep. Saldo: ${balance} pkt.`,
      link: "/historia",
    });
    return { transaction: sale, pointsReversed: sale.pointsAwarded, balance, duplicate: false };
  });
}
