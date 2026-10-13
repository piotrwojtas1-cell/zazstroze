import { requireStaffPage } from "@/server/auth/current";
import { listAudit } from "@/server/services/admin";
import { AdminHeader, Table } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";

export const metadata = { title: "Dziennik audytu" };

const ACTIONS: Record<string, string> = {
  "points.adjust": "Korekta punktów", "coupon.cancel": "Anulowanie kuponu", "card.status": "Status karty", "reward.create": "Nowa nagroda", "reward.update": "Edycja nagrody",
  "campaign.create": "Nowa kampania", "campaign.update": "Edycja kampanii", "campaign.notify": "Wysyłka powiadomienia", "article.create": "Nowa porada", "article.update": "Edycja porady",
  "config.update": "Zmiana reguł", "tier.update": "Zmiana poziomu", "staff.create": "Nowy pracownik", "staff.update": "Zmiana pracownika", "role.permissions": "Zmiana uprawnień roli",
  "integration.create": "Nowa integracja", "integration.enable": "Włączenie integracji", "integration.disable": "Wyłączenie integracji", "complaint.update": "Reklamacja",
  "pos.sale": "Sprzedaż (kasa demo)", "pos.return": "Zwrot (kasa demo)", "pos.void": "Anulowanie (kasa demo)", "account.delete": "Usunięcie konta",
  "gardenTask.create": "Kalendarz: nowe zadanie", "gardenTask.update": "Kalendarz: edycja", "gardenTask.delete": "Kalendarz: usunięcie",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ akcja?: string; obiekt?: string }> }) {
  await requireStaffPage("audit.view");
  const sp = await searchParams;
  const entries = await listAudit({ action: sp.akcja?.slice(0, 60), entityId: sp.obiekt?.slice(0, 64) });
  return (
    <>
      <AdminHeader title="Dziennik audytu" description="Niezmienny zapis operacji administracyjnych i zmian salda (tabela chroniona przed edycją i usuwaniem)." />
      <form className="mb-5 flex flex-wrap gap-2">
        <select name="akcja" defaultValue={sp.akcja ?? ""} className="input max-w-xs" aria-label="Rodzaj operacji">
          <option value="">Wszystkie operacje</option>
          {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input name="obiekt" defaultValue={sp.obiekt} placeholder="ID obiektu" className="input max-w-xs" aria-label="ID obiektu" />
        <button className="rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white">Filtruj</button>
      </form>
      {entries.length === 0 ? <EmptyState icon="📜" title="Brak wpisów" /> : (
        <Table>
          <thead><tr><th>Czas</th><th>Kto</th><th>Operacja</th><th>Obiekt</th><th>Powód / szczegóły</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="align-top">
                <td className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</td>
                <td className="text-xs">{e.actorLabel}</td>
                <td className="text-sm font-medium">{ACTIONS[e.action] ?? e.action}</td>
                <td className="font-mono text-[11px] text-muted">{e.entityType}<br />{e.entityId}</td>
                <td className="max-w-md text-xs">
                  {e.reason && <p className="mb-1">{e.reason}</p>}
                  {(e.before != null || e.after != null) && (
                    <details>
                      <summary className="cursor-pointer text-muted">zmiany</summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-sand/60 p-2 text-[11px]">{JSON.stringify({ przed: e.before, po: e.after }, null, 1)}</pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
