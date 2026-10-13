import "server-only";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { tierProgress } from "../loyalty/tiers";
import { listCatalog } from "../loyalty/rewards";
import { expireCoupons, USABLE_STATUSES } from "../loyalty/coupons";
import { currentConsents } from "./consents";
import { currentMonth } from "@/lib/dates";

export async function getCardForUser(userId: string) {
  const card = await prisma.loyaltyCard.findUnique({ where: { userId }, include: { tier: true } });
  if (!card) throw new AppError("CARD_NOT_FOUND", "Nie znaleziono Twojej karty.");
  return card;
}

/** Dane ekranu „Start”. */
export async function getHomeData(userId: string, now = new Date()) {
  const card = await getCardForUser(userId);
  await expireCoupons(prisma, now);
  const [progress, catalog, coupons, interests, consents, unread] = await Promise.all([
    tierProgress(prisma, card.id),
    listCatalog(prisma, now),
    prisma.coupon.findMany({ where: { cardId: card.id, status: { in: USABLE_STATUSES } }, orderBy: { expiresAt: "asc" }, take: 3 }),
    prisma.userInterest.findMany({ where: { userId }, select: { interestKey: true } }),
    currentConsents(prisma, userId),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  const interestKeys = interests.map((i) => i.interestKey);
  const affordable = catalog.filter((r) => r.pointsCost <= card.pointsBalance).sort((a, b) => b.pointsCost - a.pointsCost)[0];
  const nextReward = catalog.filter((r) => r.pointsCost > card.pointsBalance).sort((a, b) => a.pointsCost - b.pointsCost)[0];

  const offers = await prisma.campaign.findMany({
    where: { active: true, showInApp: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: "asc" },
    take: 10,
  });
  // Personalizacja: oferty zgodne z wybranymi zainteresowaniami na początku listy.
  const ranked = offers
    .filter((o) => o.tierKeys.length === 0 || (card.tier && o.tierKeys.includes(card.tier.key)))
    .sort((a, b) => score(b.interestKeys, interestKeys) - score(a.interestKeys, interestKeys))
    .slice(0, 4);

  const month = currentMonth(now);
  const tasks = await prisma.gardenTask.findMany({ where: { month }, orderBy: { sort: "asc" } });
  const tasksRanked = tasks.sort((a, b) => score(b.interestKey ? [b.interestKey] : [], interestKeys) - score(a.interestKey ? [a.interestKey] : [], interestKeys)).slice(0, 3);
  const tip = await prisma.article.findFirst({
    where: {
      status: "PUBLISHED",
      OR: [{ months: { has: month } }, { months: { isEmpty: true } }],
      ...(interestKeys.length ? { interestKeys: { hasSome: interestKeys } } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });

  return { card, progress, affordable, nextReward, coupons, offers: ranked, tasks: tasksRanked, tip, month, consents, unread, interestKeys };
}

const score = (itemKeys: string[], userKeys: string[]) => itemKeys.filter((k) => userKeys.includes(k)).length;

export async function getHistory(userId: string, opts: { cursor?: string; take?: number } = {}) {
  const card = await getCardForUser(userId);
  const take = Math.min(opts.take ?? 30, 100);
  const entries = await prisma.pointsLedger.findMany({
    where: { cardId: card.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: { transaction: { select: { id: true, externalId: true, totalGrosze: true, type: true, occurredAt: true, store: { select: { name: true } } } } },
  });
  const hasMore = entries.length > take;
  return { entries: entries.slice(0, take), nextCursor: hasMore ? entries[take - 1]?.id : null, balance: card.pointsBalance };
}

export async function getPurchases(userId: string) {
  const card = await getCardForUser(userId);
  return prisma.transaction.findMany({
    where: { cardId: card.id },
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { store: { select: { name: true } }, _count: { select: { items: true } } },
  });
}

export async function getTransactionForUser(userId: string, transactionId: string) {
  const t = await prisma.transaction.findFirst({
    where: { id: transactionId, card: { userId } },
    include: {
      items: true,
      store: true,
      ledger: { orderBy: { createdAt: "asc" } },
      redemptions: { where: { releasedAt: null }, include: { coupon: { select: { title: true, code: true } } } },
      originalTransaction: { select: { id: true, externalId: true, occurredAt: true } },
      returns: { select: { id: true, externalId: true, occurredAt: true, totalGrosze: true, pointsAwarded: true } },
    },
  });
  if (!t) throw notFound("Transakcja");
  return t;
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { profile: true, card: { include: { tier: true } }, interests: true },
  });
  return user;
}
