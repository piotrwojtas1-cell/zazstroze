import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/server/auth/current";
import { getCustomerDetail } from "@/server/services/admin";
import { CONSENT_LABELS } from "@/server/services/consents";
import { AppError } from "@/server/errors";
import { getActiveConfig } from "@/server/loyalty/config";
import { prisma } from "@/server/db";
import { AdminHeader, Panel, Table } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { AdjustPointsForm, CardStatusControl, CancelCouponButton } from "@/components/admin/customer-actions";
import { formatCardNumber } from "@/lib/luhn";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatNumber, formatPLN } from "@/lib/money";
import { COUPON_STATUS_LABELS, LEDGER_LABELS } from "@/lib/loyalty-format";

export const metadata = { title: "Klient" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage("customers.view");
  const { id } = await params;
  const { user, consents } = await getCustomerDetail(id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const card = user.card;
  const config = await getActiveConfig(prisma);
  const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");

  return (
    <>
      <AdminHeader
        title={name}
        description={<>{user.email} · klient od {formatDate(user.createdAt)} {user.status === "DELETED" && <Badge tone="gray" className="ml-2">Konto usunięte (zanonimizowane)</Badge>}</>}
        actions={<Link href="/admin/klienci" className="text-sm font-medium text-forest-700">← Lista klientów</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Panel title="Karta">
            {card ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Numer</dt><dd className="font-mono">{formatCardNumber(card.number)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Saldo</dt><dd className="font-display text-xl font-semibold" data-testid="admin-balance">{formatNumber(card.pointsBalance)} pkt</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Zdobyte łącznie</dt><dd>{formatNumber(card.lifetimePoints)} pkt</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Poziom</dt><dd>{card.tier?.name ?? "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Status</dt><dd>{card.status === "ACTIVE" ? <Badge>Aktywna</Badge> : <Badge tone="red">{card.status === "BLOCKED" ? "Zablokowana" : "Zamknięta"}</Badge>}</dd></div>
              </dl>
            ) : <p className="text-sm text-muted">Brak karty.</p>}
            {card && staff.permissions.has("customers.manage") && card.status !== "CLOSED" && (
              <div className="mt-4 border-t border-forest-900/5 pt-4"><CardStatusControl cardId={card.id} status={card.status} /></div>
            )}
          </Panel>
          {card && staff.permissions.has("points.adjust") && card.status !== "CLOSED" && (
            <Panel title="Korekta punktów">
              <AdjustPointsForm cardId={card.id} limit={config.maxManualAdjustment} canExceed={staff.permissions.has("points.adjust.large")} />
            </Panel>
          )}
          <Panel title="Dane i zgody">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Telefon</dt><dd>{user.profile?.phone ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Kod pocztowy</dt><dd>{user.profile?.postalCode ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Zainteresowania</dt><dd className="text-right">{user.interests.map((i) => i.interest.name).join(", ") || "—"}</dd></div>
            </dl>
            <ul className="mt-3 space-y-1 border-t border-forest-900/5 pt-3 text-xs">
              {Object.entries(consents).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span>{CONSENT_LABELS[k as keyof typeof CONSENT_LABELS]}</span><span className={v ? "font-semibold text-forest-700" : "text-muted"}>{v ? "tak" : "nie"}</span></li>
              ))}
            </ul>
            {user.dataRequests.length > 0 && (
              <div className="mt-3 border-t border-forest-900/5 pt-3 text-xs text-muted">
                Wnioski RODO: {user.dataRequests.map((d) => `${d.type === "EXPORT" ? "eksport" : "usunięcie"} (${formatDate(d.createdAt)})`).join(", ")}
              </div>
            )}
          </Panel>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Rejestr punktów (ostatnie 50)">
            <Table className="shadow-none ring-0">
              <thead><tr><th>Data</th><th>Operacja</th><th>Powód</th><th className="text-right">Punkty</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {card?.ledger.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</td>
                    <td><Badge tone={e.points > 0 ? "green" : "clay"}>{LEDGER_LABELS[e.type]}</Badge></td>
                    <td className="max-w-[260px]">
                      <p className="truncate" title={e.reason}>{e.reason}</p>
                      {e.actor && <p className="text-xs text-muted">przez {e.actor.email}</p>}
                    </td>
                    <td className={e.points > 0 ? "text-right font-semibold text-forest-700" : "text-right font-semibold text-clay-700"}>{e.points > 0 ? "+" : ""}{e.points}</td>
                    <td className="text-right tabular-nums">{e.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Panel>
          <Panel title="Kupony">
            {card && card.coupons.length > 0 ? (
              <Table className="shadow-none ring-0">
                <thead><tr><th>Kupon</th><th>Kod</th><th>Status</th><th>Ważny do</th><th /></tr></thead>
                <tbody>
                  {card.coupons.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}<p className="text-xs text-muted">{c.pointsSpent} pkt</p></td>
                      <td className="font-mono text-xs">{c.code}</td>
                      <td><Badge tone={c.status === "USED" ? "gray" : c.status === "EXPIRED" || c.status === "CANCELLED" ? "red" : "green"}>{COUPON_STATUS_LABELS[c.status]}</Badge></td>
                      <td className="whitespace-nowrap text-xs">{formatDate(c.expiresAt)}</td>
                      <td className="text-right">
                        {staff.permissions.has("coupons.manage") && (c.status === "AVAILABLE" || c.status === "ACTIVATED") && (
                          <CancelCouponButton couponId={c.id} canRefund={staff.permissions.has("points.adjust") && c.pointsSpent > 0} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : <p className="text-sm text-muted">Brak kuponów.</p>}
          </Panel>
          <Panel title="Transakcje (ostatnie 30)">
            {card && card.transactions.length > 0 ? (
              <Table className="shadow-none ring-0">
                <thead><tr><th>Data</th><th>Paragon</th><th>Typ</th><th className="text-right">Kwota</th><th className="text-right">Punkty</th></tr></thead>
                <tbody>
                  {card.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap text-xs">{formatDateTime(t.occurredAt)}</td>
                      <td className="font-mono text-xs">{staff.permissions.has("transactions.view") ? <Link className="text-forest-700 hover:underline" href={`/admin/transakcje/${t.id}`}>{t.externalId}</Link> : t.externalId}</td>
                      <td>{t.type === "RETURN" ? "Zwrot" : t.status === "VOIDED" ? "Anulowana" : "Sprzedaż"}</td>
                      <td className="text-right tabular-nums">{formatPLN(t.totalGrosze)}</td>
                      <td className="text-right tabular-nums">{t.pointsAwarded}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : <p className="text-sm text-muted">Brak transakcji.</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
