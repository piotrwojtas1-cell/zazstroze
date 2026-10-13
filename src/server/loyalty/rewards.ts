import "server-only";
import type { Coupon, Reward } from "@prisma/client";
import { prisma, withTx, isUniqueViolation, type Db } from "../db";
import { AppError, notFound } from "../errors";
import { couponCode } from "../crypto";
import { postLedgerEntry, lockCard } from "./ledger";
import { notify } from "../services/notifications";
import { addDays } from "@/lib/dates";
import { formatPLN } from "@/lib/money";

/** Nagrody dostępne w katalogu w danym momencie (aktywne, w oknie dat, z zapasem). */
export async function listCatalog(db: Db = prisma, now = new Date()) {
  return db.reward.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    include: { requiredTier: true },
    orderBy: [{ sortOrder: "asc" }, { pointsCost: "asc" }],
  });
}

export function rewardValueLabel(r: Pick<Reward, "type" | "valueGrosze" | "percentBp">): string {
  if (r.type === "PERCENT_OFF") return `${(r.percentBp ?? 0) / 100}% rabatu`;
  if (r.type === "FREE_PRODUCT") return `Produkt gratis do ${formatPLN(r.valueGrosze ?? 0)}`;
  return `${formatPLN(r.valueGrosze ?? 0)} rabatu`;
}

export interface RedeemResult {
  coupon: Coupon;
  balance: number;
  replayed: boolean;
}

/**
 * Wymiana punktów na nagrodę (kupon). Gwarancje:
 *  - saldo i limit na klienta sprawdzane pod blokadą wiersza karty (brak wyścigów przy równoległych żądaniach),
 *  - zapas nagrody zmniejszany warunkowo (UPDATE ... WHERE stock > 0),
 *  - idempotencja: ten sam klucz od klienta zwraca ten sam kupon zamiast tworzyć drugi.
 */
export async function redeemReward(params: {
  userId: string;
  rewardId: string;
  idempotencyKey: string;
  now?: Date;
}): Promise<RedeemResult> {
  const { userId, rewardId } = params;
  const now = params.now ?? new Date();
  const card = await prisma.loyaltyCard.findUnique({ where: { userId } });
  if (!card) throw new AppError("CARD_NOT_FOUND", "Nie znaleziono Twojej karty.");
  const ledgerKey = `redeem:${card.id}:${params.idempotencyKey}`;

  const existing = await findReplay(ledgerKey, card.id);
  if (existing) return existing;

  try {
    return await withTx(async (tx) => {
      const locked = await lockCard(tx, card.id);
      if (locked.status !== "ACTIVE") throw new AppError("CARD_INACTIVE", "Twoja karta jest nieaktywna. Skontaktuj się ze sklepem.");

      const reward = await tx.reward.findUnique({ where: { id: rewardId }, include: { requiredTier: true } });
      if (!reward) throw notFound("Nagroda");
      if (!reward.active || (reward.startsAt && reward.startsAt > now) || (reward.endsAt && reward.endsAt <= now)) {
        throw new AppError("REWARD_UNAVAILABLE", "Ta nagroda jest obecnie niedostępna.");
      }
      if (reward.requiredTier) {
        const cardTier = locked.tierId ? await tx.tier.findUnique({ where: { id: locked.tierId } }) : null;
        if (!cardTier || cardTier.minPoints < reward.requiredTier.minPoints) {
          throw new AppError("TIER_REQUIRED", `Nagroda dostępna od poziomu ${reward.requiredTier.name}.`);
        }
      }
      if (locked.pointsBalance < reward.pointsCost) {
        throw new AppError("INSUFFICIENT_POINTS", `Brakuje Ci ${reward.pointsCost - locked.pointsBalance} pkt do tej nagrody.`, {
          balance: locked.pointsBalance,
          required: reward.pointsCost,
        });
      }
      if (reward.perCustomerLimit != null) {
        const used = await tx.coupon.count({ where: { cardId: card.id, rewardId, status: { not: "CANCELLED" } } });
        if (used >= reward.perCustomerLimit) {
          throw new AppError("LIMIT_REACHED", "Osiągnięto limit wymian tej nagrody na jednego klienta.");
        }
      }
      if (reward.stock != null) {
        const dec = await tx.reward.updateMany({ where: { id: rewardId, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
        if (dec.count === 0) throw new AppError("OUT_OF_STOCK", "Ta nagroda właśnie się wyczerpała.");
      }

      const coupon = await tx.coupon.create({
        data: {
          code: couponCode(),
          cardId: card.id,
          source: "REWARD",
          rewardId: reward.id,
          title: reward.name,
          description: reward.description,
          type: reward.type,
          valueGrosze: reward.valueGrosze,
          percentBp: reward.percentBp,
          minBasketGrosze: reward.minBasketGrosze,
          maxDiscountGrosze: reward.maxDiscountGrosze,
          excludedCategories: reward.excludedCategories,
          pointsSpent: reward.pointsCost,
          validFrom: now,
          expiresAt: addDays(now, reward.validDays),
        },
      });
      const entry = await postLedgerEntry(tx, {
        cardId: card.id,
        type: "REDEEM",
        points: -reward.pointsCost,
        reason: `Wymiana na nagrodę: ${reward.name}`,
        idempotencyKey: ledgerKey,
        couponId: coupon.id,
      });
      await notify(tx, userId, {
        category: "TRANSACTIONAL",
        title: "Nagroda odebrana",
        body: `Kupon „${reward.name}” jest gotowy do użycia. Ważny do ${coupon.expiresAt.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}.`,
        link: "/kupony",
      });
      return { coupon, balance: entry.balanceAfter, replayed: false };
    });
  } catch (error) {
    // Równoległe żądanie z tym samym kluczem idempotencji wygrało wyścig — zwracamy jego wynik.
    if (isUniqueViolation(error, "idempotencyKey")) {
      const replay = await findReplay(ledgerKey, card.id);
      if (replay) return replay;
    }
    throw error;
  }
}

async function findReplay(ledgerKey: string, cardId: string): Promise<RedeemResult | null> {
  const entry = await prisma.pointsLedger.findUnique({ where: { idempotencyKey: ledgerKey }, include: { coupon: true } });
  if (!entry?.coupon) return null;
  const card = await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: cardId } });
  return { coupon: entry.coupon, balance: card.pointsBalance, replayed: true };
}
