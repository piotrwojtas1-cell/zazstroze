import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { dashboardKpis, balanceIntegrityCheck } from "@/server/services/reports";
import { prisma } from "@/server/db";
import { AdminHeader, Stat, Table, Panel } from "@/components/admin/ui";
import { Badge, Alert } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { formatNumber, formatPLN } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";

export const metadata = { title: "Pulpit" };

export default async function AdminDashboard() {
  const user = await requireStaffPage("dashboard.view");
  const [k, integrity, recent, complaints] = await Promise.all([
    dashboardKpis(),
    user.permissions.has("reports.view") ? balanceIntegrityCheck() : Promise.resolve(null),
    user.permissions.has("transactions.view")
      ? prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { card: { select: { number: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } } } } } })
      : Promise.resolve([]),
    prisma.complaint.findMany({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, orderBy: { createdAt: "asc" }, take: 5 }),
  ]);
  return (
    <>
      <AdminHeader
        title={`Dzień dobry, ${user.firstName}`}
        description="Kluczowe wskaźniki programu z ostatnich 30 dni"
        actions={user.permissions.has("pos.operate") && <ButtonLink href="/admin/kasa">Otwórz kasę demo</ButtonLink>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Członkowie programu" value={formatNumber(k.customers)} hint={`+${formatNumber(k.newCustomers)} w 30 dni`} />
        <Stat label="Aktywni klienci" value={formatNumber(k.activeCustomers)} hint="≥ 1 zakup w 30 dni" />
        <Stat label="Sprzedaż z kartą" value={formatPLN(k.salesValueGrosze)} hint={`${formatNumber(k.salesCount)} transakcji`} />
        <Stat label="Średni koszyk" value={formatPLN(k.avgBasketGrosze)} />
        <Stat label="Punkty wydane" value={formatNumber(k.pointsIssued)} />
        <Stat label="Punkty wymienione" value={formatNumber(k.pointsRedeemed)} />
        <Stat label="Kupony użyte" value={formatNumber(k.couponsUsed)} />
        <Stat label="Otwarte reklamacje" value={formatNumber(k.openComplaints)} tone={k.openComplaints > 0 ? "warn" : "default"} hint={k.posErrors > 0 ? `Błędy POS: ${k.posErrors}` : undefined} />
      </div>
      {integrity && (
        <div className="mt-4">
          {integrity.length === 0 ? (
            <Alert tone="success">Kontrola spójności: saldo każdej karty jest równe sumie operacji w rejestrze punktów.</Alert>
          ) : (
            <Alert tone="error" title="Wykryto niespójność salda">{integrity.length} kart(y) ma saldo różne od rejestru. Sprawdź raport spójności.</Alert>
          )}
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {recent.length > 0 && (
          <div className="lg:col-span-2">
            <h2 className="mb-3 font-sans text-base font-semibold text-ink">Ostatnie transakcje</h2>
            <Table>
              <thead>
                <tr><th>Data</th><th>Klient</th><th>Typ</th><th className="text-right">Kwota</th><th className="text-right">Punkty</th></tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap"><Link href={`/admin/transakcje/${t.id}`} className="text-forest-700 hover:underline">{formatDateTime(t.occurredAt)}</Link></td>
                    <td>{[t.card.user.profile?.firstName, t.card.user.profile?.lastName].filter(Boolean).join(" ")}</td>
                    <td>{t.type === "SALE" ? <Badge tone={t.status === "VOIDED" ? "red" : "green"}>{t.status === "VOIDED" ? "Anulowana" : "Sprzedaż"}</Badge> : <Badge tone="clay">Zwrot</Badge>}</td>
                    <td className="text-right tabular-nums">{formatPLN(t.totalGrosze)}</td>
                    <td className="text-right tabular-nums">{t.pointsAwarded}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <Panel title="Reklamacje do obsługi" actions={<Link href="/admin/reklamacje" className="text-sm font-medium text-forest-700">Wszystkie</Link>}>
          {complaints.length === 0 ? (
            <p className="text-sm text-muted">Brak otwartych zgłoszeń. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {complaints.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="font-medium">{c.subject}</p>
                  <p className="text-xs text-muted">{formatDateTime(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
