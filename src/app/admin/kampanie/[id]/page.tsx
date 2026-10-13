import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/current";
import { prisma } from "@/server/db";
import { AdminHeader } from "@/components/admin/ui";
import { CampaignForm } from "@/components/admin/forms";
import { CATEGORY_OPTIONS } from "@/components/admin/categories";

export const metadata = { title: "Kampania" };

const day = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default async function CampaignEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("campaigns.manage");
  const { id } = await params;
  const c = id === "nowa" ? null : await prisma.campaign.findUnique({ where: { id } });
  if (id !== "nowa" && !c) notFound();
  const [tiers, interests] = await Promise.all([prisma.tier.findMany({ orderBy: { minPoints: "asc" } }), prisma.interest.findMany({ orderBy: { sort: "asc" } })]);
  return (
    <>
      <AdminHeader title={c ? `Edycja: ${c.name}` : "Nowa kampania"} actions={<Link href="/admin/kampanie" className="text-sm font-medium text-forest-700">← Kampanie</Link>} />
      <CampaignForm
        id={c?.id ?? null}
        categories={CATEGORY_OPTIONS}
        tiers={tiers.map((t) => ({ key: t.key, label: t.name }))}
        interests={interests.map((i) => ({ key: i.key, label: `${i.emoji} ${i.name}` }))}
        initial={c ? { ...c, startsAt: day(c.startsAt), endsAt: day(c.endsAt) } : null}
      />
    </>
  );
}
