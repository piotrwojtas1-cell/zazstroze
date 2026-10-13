import "server-only";
import type { Tier } from "@prisma/client";
import type { Db, Tx } from "../db";
import { EARNING_TYPES } from "./ledger";
import { getActiveConfig } from "./config";
import { notify } from "../services/notifications";

export async function getTiers(db: Db): Promise<Tier[]> {
  return db.tier.findMany({ orderBy: { minPoints: "asc" } });
}

export function tierForPoints(tiers: Tier[], points: number): Tier | null {
  let result: Tier | null = null;
  for (const t of [...tiers].sort((a, b) => a.minPoints - b.minPoints)) if (points >= t.minPoints) result = t;
  return result ?? tiers[0] ?? null;
}

/** Punkty zdobyte (netto) w oknie poziomu — podstawa przydziału poziomu. */
export async function earnedInWindow(db: Db, cardId: string, windowDays: number, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - windowDays * 86_400_000);
  const agg = await db.pointsLedger.aggregate({
    where: { cardId, type: { in: EARNING_TYPES }, createdAt: { gte: since } },
    _sum: { points: true },
  });
  return Math.max(0, agg._sum.points ?? 0);
}

/**
 * Przelicza poziom karty po zmianie punktów. Awans jest natychmiastowy; spadek następuje,
 * gdy punkty zdobyte w oknie (np. po zwrocie) spadną poniżej progu.
 */
export async function recomputeTier(tx: Tx, cardId: string): Promise<{ changed: boolean; tier: Tier | null }> {
  const config = await getActiveConfig(tx);
  const tiers = await getTiers(tx);
  const card = await tx.loyaltyCard.findUniqueOrThrow({ where: { id: cardId }, select: { tierId: true, userId: true } });
  const earned = await earnedInWindow(tx, cardId, config.tierWindowDays);
  const target = tierForPoints(tiers, earned);
  if (!target || target.id === card.tierId) return { changed: false, tier: target };
  await tx.loyaltyCard.update({ where: { id: cardId }, data: { tierId: target.id, tierUpdatedAt: new Date() } });
  const previous = tiers.find((t) => t.id === card.tierId);
  if (!previous || target.minPoints > previous.minPoints) {
    await notify(tx, card.userId, {
      category: "TRANSACTIONAL",
      title: `Gratulacje! Osiągasz poziom ${target.name}`,
      body: `Od teraz korzystasz z korzyści poziomu ${target.name}. Sprawdź szczegóły na swojej karcie.`,
      link: "/karta",
    });
  }
  return { changed: true, tier: target };
}

/** Postęp do następnego poziomu (do wyświetlenia w aplikacji). */
export async function tierProgress(db: Db, cardId: string) {
  const config = await getActiveConfig(db);
  const tiers = await getTiers(db);
  const earned = await earnedInWindow(db, cardId, config.tierWindowDays);
  const current = tierForPoints(tiers, earned);
  const next = tiers.find((t) => t.minPoints > earned) ?? null;
  return { earned, current, next, windowDays: config.tierWindowDays, missing: next ? next.minPoints - earned : 0 };
}
