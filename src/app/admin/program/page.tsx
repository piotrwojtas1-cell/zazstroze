import { requireStaffPage } from "@/server/auth/current";
import { listConfigVersions } from "@/server/services/admin";
import { getTiers } from "@/server/loyalty/tiers";
import { prisma } from "@/server/db";
import { AdminHeader, Panel, Table } from "@/components/admin/ui";
import { Alert, Badge } from "@/components/ui/misc";
import { ConfigForm, TierForm } from "@/components/admin/forms";
import { CATEGORY_OPTIONS } from "@/components/admin/categories";
import { formatDateTime } from "@/lib/dates";
import { formatPLN } from "@/lib/money";

export const metadata = { title: "Reguły programu" };

export default async function ProgramPage() {
  await requireStaffPage("config.manage");
  const [versions, tiers] = await Promise.all([listConfigVersions(), getTiers(prisma)]);
  const active = versions.find((v) => v.active)!;
  return (
    <>
      <AdminHeader title="Reguły programu" description="Każda zmiana tworzy nową wersję konfiguracji (wcześniejsze transakcje zachowują wersję, wg której je rozliczono)." />
      <div className="mb-5">
        <Alert tone="warning" title="Konfiguracja demonstracyjna">
          Bieżące wartości (np. 1 pkt za 1 zł, nagroda 5 zł za 100 pkt) są przykładowe i nie stanowią zatwierdzonej polityki biznesowej. Przed uruchomieniem programu muszą zostać zatwierdzone przez właściciela i zweryfikowane pod kątem kosztów oraz zgodności z regulaminem.
        </Alert>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title={`Przeliczanie punktów — wersja ${active.version}`}>
          <ConfigForm initial={active} categories={CATEGORY_OPTIONS} />
        </Panel>
        <Panel title="Historia wersji">
          <Table className="shadow-none ring-0 [&_table]:min-w-0">
            <thead><tr><th>Wersja</th><th>Przelicznik</th><th>Data</th></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td>v{v.version} {v.active && <Badge className="ml-1">aktywna</Badge>}<p className="text-xs text-muted">{v.note}</p></td>
                  <td className="text-xs">{v.earnRateBp / 10000} pkt/zł · min {formatPLN(v.minQualifyingGrosze)}</td>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
      <Panel title="Poziomy członkostwa" className="mt-6">
        <p className="mb-4 text-sm text-muted">Poziom przydzielany jest według punktów zdobytych w oknie {active.tierWindowDays} dni. Mnożnik zwiększa punkty podstawowe (np. 1,1 = +10%).</p>
        <div className="grid gap-4 lg:grid-cols-3">
          {tiers.map((t) => <TierForm key={t.id} tier={t} />)}
        </div>
      </Panel>
    </>
  );
}
