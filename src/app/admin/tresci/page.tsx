import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { listArticlesAdmin } from "@/server/services/admin";
import { listGardenTasks, listInterests } from "@/server/services/content";
import { AdminHeader, Panel, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { GardenTaskForm } from "@/components/admin/forms";
import { DeleteTaskButton } from "@/components/admin/delete-task";
import { formatDate, MONTHS } from "@/lib/dates";

export const metadata = { title: "Porady i kalendarz" };

export default async function ContentPage() {
  await requireStaffPage("content.manage");
  const [articles, tasks, interests] = await Promise.all([listArticlesAdmin(), listGardenTasks(), listInterests()]);
  return (
    <>
      <AdminHeader title="Porady i kalendarz" description="Treści sezonowe widoczne w aplikacji klienta" actions={<ButtonLink href="/admin/tresci/nowa">Nowa porada</ButtonLink>} />
      <Table>
        <thead><tr><th>Porada</th><th>Kategoria</th><th>Miesiące</th><th>Status</th><th>Aktualizacja</th></tr></thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/admin/tresci/${a.id}`} className="font-medium text-forest-800 hover:underline"><span className="mr-1.5" aria-hidden>{a.emoji}</span>{a.title}</Link></td>
              <td className="text-sm">{a.category}</td>
              <td className="text-xs text-muted">{a.months.length ? a.months.map((m) => MONTHS[m - 1]!.slice(0, 3)).join(", ") : "cały rok"}</td>
              <td>{a.status === "PUBLISHED" ? <Badge>Opublikowana</Badge> : a.status === "DRAFT" ? <Badge tone="amber">Szkic</Badge> : <Badge tone="gray">Archiwum</Badge>}</td>
              <td className="text-xs">{formatDate(a.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title={`Kalendarz prac (${tasks.length})`}>
          <div className="grid gap-4 sm:grid-cols-2">
            {MONTHS.map((m, i) => (
              <div key={m}>
                <h3 className="mb-1 font-sans text-sm font-semibold capitalize text-ink">{m}</h3>
                <ul className="space-y-1 text-sm">
                  {tasks.filter((t) => t.month === i + 1).map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-2">
                      <span className="text-muted">{t.title}</span>
                      <DeleteTaskButton id={t.id} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Dodaj zadanie do kalendarza">
          <GardenTaskForm interests={interests.map((i) => ({ key: i.key, label: i.name }))} />
        </Panel>
      </div>
    </>
  );
}
