import { requireStaffPage } from "@/server/auth/current";
import { listIntegrations, listPosRequests } from "@/server/services/admin";
import { AdminHeader, Panel, Table } from "@/components/admin/ui";
import { Badge, Alert } from "@/components/ui/misc";
import { IntegrationActions, CreateIntegration } from "@/components/admin/integrations";
import { formatDateTime } from "@/lib/dates";

export const metadata = { title: "Integracje POS" };

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ bledy?: string }> }) {
  await requireStaffPage("integrations.manage");
  const { bledy } = await searchParams;
  const [integrations, requests] = await Promise.all([listIntegrations(), listPosRequests(bledy === "1")]);
  return (
    <>
      <AdminHeader title="Integracje POS" description="Klucze API systemów kasowych, podpisy HMAC i dziennik żądań" actions={<CreateIntegration />} />
      <div className="mb-5">
        <Alert tone="info">
          Dostępny jest wyłącznie adapter <strong>DEMO</strong> (kanoniczny format JSON aplikacji). Podłączenie konkretnego systemu kasowego wymaga dokumentacji API dostawcy i implementacji adaptera — patrz <code>docs/POS_INTEGRATION.md</code>.
        </Alert>
      </div>
      <Table>
        <thead><tr><th>Nazwa</th><th>Key ID</th><th>Adapter</th><th>Ostatnie użycie</th><th>Status</th><th /></tr></thead>
        <tbody>
          {integrations.map((i) => (
            <tr key={i.id}>
              <td className="font-medium">{i.name}</td>
              <td className="font-mono text-xs">{i.keyId}</td>
              <td>{i.adapter === "INTERNAL" ? <Badge tone="gray">Kasa w panelu</Badge> : <Badge tone="moss">{i.adapter}</Badge>}</td>
              <td className="text-xs">{i.lastUsedAt ? formatDateTime(i.lastUsedAt) : "—"}</td>
              <td>{i.active ? <Badge>Aktywna</Badge> : <Badge tone="red">Wyłączona</Badge>}</td>
              <td className="text-right">{i.adapter !== "INTERNAL" && <IntegrationActions id={i.id} active={i.active} />}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Panel title="Dziennik żądań POS (ostatnie 100)" className="mt-6" actions={<a href={bledy === "1" ? "/admin/integracje" : "/admin/integracje?bledy=1"} className="text-sm font-medium text-forest-700">{bledy === "1" ? "Pokaż wszystkie" : "Tylko błędy"}</a>}>
        {requests.length === 0 ? <p className="text-sm text-muted">Brak żądań.</p> : (
          <Table className="shadow-none ring-0">
            <thead><tr><th>Czas</th><th>Integracja</th><th>Endpoint</th><th>Status</th><th>Kod błędu</th><th className="text-right">ms</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</td>
                  <td className="text-xs">{r.integration.name}</td>
                  <td className="font-mono text-xs">{r.endpoint}</td>
                  <td><Badge tone={r.status < 400 ? "green" : r.status < 500 ? "amber" : "red"}>{r.status}</Badge></td>
                  <td className="font-mono text-xs">{r.errorCode ?? ""}</td>
                  <td className="text-right text-xs tabular-nums">{r.durationMs ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
