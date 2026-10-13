import { apiRoute } from "@/server/http";
import { getCardForUser } from "@/server/services/customer";
import { tierProgress } from "@/server/loyalty/tiers";
import { prisma } from "@/server/db";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => {
  const card = await getCardForUser(user!.id);
  const progress = await tierProgress(prisma, card.id);
  return {
    number: card.number,
    status: card.status,
    pointsBalance: card.pointsBalance,
    tier: card.tier && { key: card.tier.key, name: card.tier.name, multiplierBp: card.tier.multiplierBp },
    progress: { earned: progress.earned, next: progress.next && { name: progress.next.name, minPoints: progress.next.minPoints }, missing: progress.missing },
  };
});
