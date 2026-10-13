import "server-only";
import type { LedgerType, Prisma } from "@prisma/client";
import type { Tx } from "../db";
import { AppError } from "../errors";

export interface LedgerEntryInput {
  cardId: string;
  type: LedgerType;
  points: number;
  reason: string;
  idempotencyKey: string;
  transactionId?: string;
  couponId?: string;
  campaignId?: string;
  actorUserId?: string;
  metadata?: Prisma.InputJsonValue;
  /** Dopuszcza saldo ujemne (np. korekta po zwrocie wydanych już punktów). */
  allowNegative?: boolean;
  /** Tylko import danych historycznych (seed) — domyślnie bieżący czas. */
  createdAt?: Date;
}

/** Typy operacji wliczane do „punktów zdobytych” (podstawa poziomu członkostwa). */
export const EARNING_TYPES: LedgerType[] = ["EARN", "BONUS", "RETURN_REVERSAL", "VOID_REVERSAL"];

/**
 * Blokuje wiersz karty (SELECT ... FOR UPDATE) — serializuje wszystkie operacje na saldzie danej karty
 * w obrębie transakcji bazodanowej. Musi być wywołane wewnątrz `withTx`.
 */
export async function lockCard(tx: Tx, cardId: string) {
  const rows = await tx.$queryRaw<{ id: string; pointsBalance: number; status: string; tierId: string | null }[]>`
    SELECT "id", "pointsBalance", "status"::text AS "status", "tierId" FROM "LoyaltyCard" WHERE "id" = ${cardId} FOR UPDATE`;
  const card = rows[0];
  if (!card) throw new AppError("CARD_NOT_FOUND", "Nie znaleziono karty.");
  return card;
}

/**
 * Jedyny sposób zmiany salda: wpis do niezmiennego rejestru + aktualizacja salda w tej samej transakcji.
 * Wymaga wcześniejszego `lockCard` (wywołuje go sam — ponowna blokada w tej samej transakcji jest bezpieczna).
 */
export async function postLedgerEntry(tx: Tx, input: LedgerEntryInput) {
  if (!Number.isInteger(input.points) || input.points === 0) {
    throw new AppError("VALIDATION_ERROR", "Liczba punktów musi być niezerową liczbą całkowitą.");
  }
  const card = await lockCard(tx, input.cardId);
  const balanceAfter = card.pointsBalance + input.points;
  if (input.points < 0 && balanceAfter < 0 && !input.allowNegative) {
    throw new AppError("INSUFFICIENT_POINTS", "Masz za mało punktów na tę operację.", {
      balance: card.pointsBalance,
      required: -input.points,
    });
  }
  const lifetimeDelta = EARNING_TYPES.includes(input.type) ? input.points : 0;
  await tx.loyaltyCard.update({
    where: { id: input.cardId },
    data: { pointsBalance: balanceAfter, lifetimePoints: { increment: lifetimeDelta } },
  });
  return tx.pointsLedger.create({
    data: {
      cardId: input.cardId,
      type: input.type,
      points: input.points,
      balanceAfter,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      transactionId: input.transactionId,
      couponId: input.couponId,
      campaignId: input.campaignId,
      actorUserId: input.actorUserId,
      metadata: input.metadata,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}
