import { requireCustomerPage } from "@/server/auth/current";
import { listGardenTasks, listInterests } from "@/server/services/content";
import { PageHeader } from "@/components/ui/misc";
import { GardenCalendar } from "@/components/app/garden-calendar";
import { currentMonth } from "@/lib/dates";

export const metadata = { title: "Kalendarz prac ogrodniczych" };

export default async function CalendarPage() {
  await requireCustomerPage();
  const [tasks, interests] = await Promise.all([listGardenTasks(), listInterests()]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Kalendarz ogrodnika" back="/porady" subtitle="Prace ogrodnicze miesiąc po miesiącu" />
      <GardenCalendar
        initialMonth={currentMonth()}
        tasks={tasks.map((t) => ({ id: t.id, month: t.month, title: t.title, description: t.description, articleSlug: t.articleSlug, interest: interests.find((i) => i.key === t.interestKey) ?? null }))}
      />
    </div>
  );
}
