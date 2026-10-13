import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { AdminHeader } from "@/components/admin/ui";
import { RewardForm } from "@/components/admin/forms";
import { CATEGORY_OPTIONS } from "@/components/admin/categories";

export const metadata = { title: "Nagroda" };

export default async function RewardEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("rewards.manage");
  const { id } = await params;
  const reward = id === "nowa" ? null : await prisma.reward.findUnique({ where: { id } });
  if (id !== "nowa" && !reward) notFound();
  const tiers = await prisma.tier.findMany({ orderBy: { minPoints: "asc" } });
  return (
    <>
      <AdminHeader title={reward ? `Edycja: ${reward.name}` : "Nowa nagroda"} actions={<Link href="/admin/nagrody" className="text-sm font-medium text-forest-700">← Nagrody</Link>} />
      <RewardForm
        id={reward?.id ?? null}
        tiers={tiers.map((t) => ({ id: t.id, name: t.name }))}
        categories={CATEGORY_OPTIONS}
        initial={
          reward
            ? {
                name: reward.name, description: reward.description, type: reward.type, pointsCost: reward.pointsCost, valueGrosze: reward.valueGrosze, percentBp: reward.percentBp,
                minBasketGrosze: reward.minBasketGrosze, maxDiscountGrosze: reward.maxDiscountGrosze, excludedCategories: reward.excludedCategories, validDays: reward.validDays,
                stock: reward.stock, perCustomerLimit: reward.perCustomerLimit, requiredTierId: reward.requiredTierId, imageEmoji: reward.imageEmoji, active: reward.active,
                startsAt: reward.startsAt?.toISOString().slice(0, 10) ?? "", endsAt: reward.endsAt?.toISOString().slice(0, 10) ?? "", sortOrder: reward.sortOrder,
              }
            : null
        }
      />
    </>
  );
}
