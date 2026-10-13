/**
 * Zadania cykliczne (uruchamiaj np. co godzinę z crona / harmonogramu platformy):
 *  - wygaszanie przeterminowanych kuponów,
 *  - usuwanie wygasłych sesji, tokenów resetu i starych liczników limitów,
 *  - przypomnienia o kuponach wygasających w ciągu 3 dni (komunikat transakcyjny, raz na kupon),
 *  - retencja dziennika żądań POS (90 dni).
 *   npm run jobs:run
 */
import { PrismaClient } from "@prisma/client";
import { expireCoupons } from "../src/server/loyalty/coupons";

const prisma = new PrismaClient();
const DAY = 86_400_000;

async function main() {
  const now = new Date();
  const expired = await expireCoupons(prisma as never, now);
  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const tokens = await prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - DAY) } } });
  const buckets = await prisma.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - DAY) } } });
  const posLogs = await prisma.posRequestLog.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 90 * DAY) } } });

  const soon = await prisma.coupon.findMany({
    where: { status: { in: ["AVAILABLE", "ACTIVATED"] }, expiresAt: { gt: now, lt: new Date(now.getTime() + 3 * DAY) } },
    include: { card: { select: { userId: true } } },
  });
  let reminders = 0;
  for (const c of soon) {
    const link = `/kupony#${c.id}`;
    const already = await prisma.notification.count({ where: { userId: c.card.userId, link } });
    if (already) continue;
    await prisma.notification.create({
      data: { userId: c.card.userId, category: "TRANSACTIONAL", title: "Kupon wkrótce wygaśnie", body: `Kupon „${c.title}” jest ważny do ${c.expiresAt.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}.`, link },
    });
    reminders++;
  }
  console.log(JSON.stringify({ at: now.toISOString(), expiredCoupons: expired, deletedSessions: sessions.count, deletedResetTokens: tokens.count, deletedRateBuckets: buckets.count, deletedPosLogs: posLogs.count, reminders }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
