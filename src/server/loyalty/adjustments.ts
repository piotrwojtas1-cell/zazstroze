import "server-only";
import { withTx, prisma, isUniqueViolation } from "../db";
import { AppError } from "../errors";
import { audit } from "../audit";
import { postLedgerEntry } from "./ledger";
import { getActiveConfig } from "./config";
import { recomputeTier } from "./tiers";
import { notify } from "../services/notifications";
import type { SessionUser } from "../auth/session";

/**
 * Ręczna korekta punktów przez pracownika. Wymaga uprawnienia `points.adjust`,
 * powyżej limitu z konfiguracji — `points.adjust.large`. Powód jest obowiązkowy i trafia do rejestru oraz audytu.
 */
export async function adjustPoints(params: {
  actor: SessionUser;
  cardId: string;
  points: number;
  reason: string;
  idempotencyKey: string;
  ipHash?: string;
}) {
  const { actor, cardId, points, reason } = params;
  if (!actor.permissions.has("points.adjust")) throw new AppError("FORBIDDEN", "Nie masz uprawnień do korekty punktów.");
  if (!Number.isInteger(points) || points === 0) throw new AppError("VALIDATION_ERROR", "Podaj niezerową liczbę punktów.");
  if (reason.trim().length < 10) throw new AppError("VALIDATION_ERROR", "Powód korekty musi mieć co najmniej 10 znaków.");

  const config = await getActiveConfig(prisma);
  if (Math.abs(points) > config.maxManualAdjustment && !actor.permissions.has("points.adjust.large")) {
    throw new AppError("FORBIDDEN", `Korekta powyżej ${config.maxManualAdjustment} pkt wymaga uprawnień administratora.`);
  }
  const ledgerKey = `adjust:${cardId}:${params.idempotencyKey}`;
  try {
    return await withTx(async (tx) => {
      const card = await tx.loyaltyCard.findUnique({ where: { id: cardId } });
      if (!card) throw new AppError("CARD_NOT_FOUND", "Nie znaleziono karty.");
      const entry = await postLedgerEntry(tx, {
        cardId,
        type: "ADJUSTMENT",
        points,
        reason: reason.trim(),
        idempotencyKey: ledgerKey,
        actorUserId: actor.id,
        // Korekta ujemna nie może zejść poniżej zera — chyba że ma to wyrównać wcześniejszy błąd (wtedy admin).
        allowNegative: actor.permissions.has("points.adjust.large"),
      });
      await audit(tx, {
        actorUserId: actor.id,
        actorLabel: actor.email,
        action: "points.adjust",
        entityType: "LoyaltyCard",
        entityId: cardId,
        reason: reason.trim(),
        before: { balance: card.pointsBalance },
        after: { balance: entry.balanceAfter, delta: points },
        ipHash: params.ipHash,
      });
      await recomputeTier(tx, cardId);
      await notify(tx, card.userId, {
        category: "TRANSACTIONAL",
        title: points > 0 ? `Dodaliśmy ${points} pkt` : `Korekta salda: ${points} pkt`,
        body: `Korekta wykonana przez obsługę sklepu. Powód: ${reason.trim()}`,
        link: "/historia",
      });
      return entry;
    });
  } catch (error) {
    if (isUniqueViolation(error, "idempotencyKey")) {
      const existing = await prisma.pointsLedger.findUnique({ where: { idempotencyKey: ledgerKey } });
      if (existing) return existing;
    }
    throw error;
  }
}
