import { requireCustomerPage } from "@/server/auth/current";
import { listInterests } from "@/server/services/content";
import { prisma } from "@/server/db";
import { PageHeader } from "@/components/ui/misc";
import { InterestsForm } from "@/components/app/profile-forms";

export const metadata = { title: "Zainteresowania" };

export default async function InterestsPage() {
  const user = await requireCustomerPage();
  const [interests, mine] = await Promise.all([listInterests(), prisma.userInterest.findMany({ where: { userId: user.id } })]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Zainteresowania" back="/profil" subtitle="Wybór jest dobrowolny. Służy do dopasowania porad, kalendarza i ofert w aplikacji." />
      <InterestsForm interests={interests.map((i) => ({ key: i.key, name: i.name, emoji: i.emoji }))} initial={mine.map((m) => m.interestKey)} />
    </div>
  );
}
