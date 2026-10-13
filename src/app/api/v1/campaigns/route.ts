import { apiRoute } from "@/server/http";
import { prisma } from "@/server/db";

export const GET = apiRoute({ auth: "public" }, async () => {
  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: { active: true, showInApp: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { endsAt: "asc" },
    select: { id: true, name: true, description: true, type: true, multiplierBp: true, bonusPoints: true, minBasketGrosze: true, categories: true, startsAt: true, endsAt: true, imageEmoji: true },
  });
  return { campaigns };
});
