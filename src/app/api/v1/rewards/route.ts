import { apiRoute } from "@/server/http";
import { listCatalog } from "@/server/loyalty/rewards";

export const GET = apiRoute({ auth: "public" }, async () => {
  const rewards = await listCatalog();
  return {
    rewards: rewards.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      pointsCost: r.pointsCost,
      valueGrosze: r.valueGrosze,
      percentBp: r.percentBp,
      minBasketGrosze: r.minBasketGrosze,
      validDays: r.validDays,
      stock: r.stock,
      imageEmoji: r.imageEmoji,
      requiredTier: r.requiredTier && { key: r.requiredTier.key, name: r.requiredTier.name },
    })),
  };
});
