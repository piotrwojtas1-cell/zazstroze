import { requireCustomerPage } from "@/server/auth/current";
import { getCardForUser } from "@/server/services/customer";
import { listCatalog } from "@/server/loyalty/rewards";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { RewardsTabs } from "@/components/app/rewards-tabs";
import { RewardCatalog } from "@/components/app/reward-catalog";
import { formatNumber } from "@/lib/money";

export const metadata = { title: "Nagrody" };

export default async function RewardsPage() {
  const user = await requireCustomerPage();
  const card = await getCardForUser(user.id);
  const rewards = await listCatalog();
  return (
    <div className="animate-fade-in">
      <PageHeader title="Nagrody" subtitle={<>Masz <strong className="text-forest-800" data-testid="rewards-balance">{formatNumber(card.pointsBalance)} pkt</strong> do wykorzystania</>} />
      <RewardsTabs active="katalog" />
      {rewards.length === 0 ? (
        <EmptyState icon="🎁" title="Katalog jest pusty" description="Nowe nagrody pojawią się wkrótce. Zbieraj punkty!" />
      ) : (
        <RewardCatalog
          balance={card.pointsBalance}
          cardActive={card.status === "ACTIVE"}
          tierMinPoints={card.tier?.minPoints ?? 0}
          rewards={rewards.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
            pointsCost: r.pointsCost,
            emoji: r.imageEmoji,
            type: r.type,
            valueGrosze: r.valueGrosze,
            percentBp: r.percentBp,
            minBasketGrosze: r.minBasketGrosze,
            validDays: r.validDays,
            outOfStock: r.stock !== null && r.stock <= 0,
            requiredTier: r.requiredTier ? { name: r.requiredTier.name, minPoints: r.requiredTier.minPoints } : null,
          }))}
        />
      )}
    </div>
  );
}
