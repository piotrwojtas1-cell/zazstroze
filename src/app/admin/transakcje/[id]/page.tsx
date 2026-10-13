import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/current";
import { getTransactionAdmin } from "@/server/services/admin";
import { AppError } from "@/server/errors";
import { AdminHeader, Panel, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { ReturnVoidActions } from "@/components/admin/return-void";
import { formatDateTime } from "@/lib/dates";
import { formatPLN } from "@/lib/money";
import { formatCardNumber } from "@/lib/luhn";
import { LEDGER_LABELS } from "@/lib/loyalty-format";

export const metadata = { title: "Transakcja" };

export default async function TransactionDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage("transactions.view");
  const { id } = await params;
  const t = await getTransactionAdmin(id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const calc = t.calculation as { explanation?: string[]; configVersion?: number } | null;
  const canOperate = staff.permissions.has("pos.operate") && t.integration.adapter === "INTERNAL" && t.type === "SALE" && t.status === "COMPLETED";
  return (
    <>
      <AdminHeader
        title={`${t.type === "RETURN" ? "Zwrot" : "Sprzedaż"} ${t.externalId}`}
        description={<>{formatDateTime(t.occurredAt)} · {t.integration.name} · {t.status === "VOIDED" ? <Badge tone="red">Anulowana: {t.voidReason}</Badge> : <Badge>Zakończona</Badge>}</>}
        actions={<Link href="/admin/transakcje" className="text-sm font-medium text-forest-700">← Transakcje</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Pozycje">
            <Table className="shadow-none ring-0">
              <thead><tr><th>SKU</th><th>Nazwa</th><th>Kategoria</th><th className="text-right">Ilość</th><th className="text-right">Rabat</th><th className="text-right">Wartość</th><th>Pkt</th></tr></thead>
              <tbody>
                {t.items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-mono text-xs">{i.sku}</td>
                    <td>{i.name}{i.returnedQuantity > 0 && <p className="text-xs text-clay-700">zwrócono {i.returnedQuantity} szt.</p>}</td>
                    <td className="text-xs">{i.category}</td>
                    <td className="text-right">{i.quantity}</td>
                    <td className="text-right tabular-nums">{formatPLN(i.discountGrosze)}</td>
                    <td className="text-right tabular-nums">{formatPLN(i.totalGrosze)}</td>
                    <td>{i.qualifying ? "tak" : <span className="text-muted">nie</span>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
          <Panel title="Operacje punktowe">
            {t.ledger.length === 0 ? <p className="text-sm text-muted">Brak operacji.</p> : (
              <ul className="divide-y divide-forest-900/5 text-sm">
                {t.ledger.map((e) => (
                  <li key={e.id} className="flex justify-between py-2"><span>{LEDGER_LABELS[e.type]} — {e.reason}</span><span className="font-semibold tabular-nums">{e.points > 0 ? "+" : ""}{e.points}</span></li>
                ))}
              </ul>
            )}
            {calc?.explanation && <p className="mt-3 text-xs text-muted">Kalkulacja (konfiguracja v{calc.configVersion}): {calc.explanation.join(" ")}</p>}
          </Panel>
          {canOperate && (
            <Panel title="Zwrot lub anulowanie (kasa demo)">
              <ReturnVoidActions
                externalId={t.externalId}
                hasReturns={t.returns.length > 0}
                items={t.items.map((i) => ({ sku: i.sku, name: i.name, available: i.quantity - i.returnedQuantity }))}
              />
            </Panel>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Podsumowanie">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Kwota</dt><dd className="font-semibold">{formatPLN(t.totalGrosze)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Podstawa punktów</dt><dd>{formatPLN(t.qualifyingGrosze)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Rabaty</dt><dd>{formatPLN(t.discountGrosze)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Punkty</dt><dd className="font-semibold">{t.pointsAwarded}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Karta</dt><dd className="font-mono text-xs">{formatCardNumber(t.card.number)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Klient</dt><dd>{staff.permissions.has("customers.view") ? <Link className="text-forest-700 hover:underline" href={`/admin/klienci/${t.card.userId}`}>{[t.card.user.profile?.firstName, t.card.user.profile?.lastName].filter(Boolean).join(" ")}</Link> : "—"}</dd></div>
            </dl>
          </Panel>
          {t.redemptions.length > 0 && (
            <Panel title="Kupony">
              <ul className="space-y-2 text-sm">
                {t.redemptions.map((r) => (
                  <li key={r.id}>{r.coupon.title} <span className="font-mono text-xs">{r.coupon.code}</span> — −{formatPLN(r.discountGrosze)} {r.releasedAt && <Badge tone="gray">zwolniony</Badge>}</li>
                ))}
              </ul>
            </Panel>
          )}
          {t.originalTransaction && (
            <Panel title="Dotyczy sprzedaży"><Link className="font-mono text-sm text-forest-700 hover:underline" href={`/admin/transakcje/${t.originalTransaction.id}`}>{t.originalTransaction.externalId}</Link></Panel>
          )}
          {t.returns.length > 0 && (
            <Panel title="Zwroty">
              <ul className="space-y-1 text-sm">
                {t.returns.map((r) => <li key={r.id}><Link className="font-mono text-forest-700 hover:underline" href={`/admin/transakcje/${r.id}`}>{r.externalId}</Link> · {formatPLN(r.totalGrosze)} · {r.pointsAwarded} pkt</li>)}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
