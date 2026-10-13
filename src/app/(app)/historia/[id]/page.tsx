import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerPage } from "@/server/auth/current";
import { getTransactionForUser } from "@/server/services/customer";
import { AppError } from "@/server/errors";
import { PageHeader, Card, Badge, SectionTitle } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { formatNumber, formatPLN } from "@/lib/money";

export const metadata = { title: "Szczegóły transakcji" };

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCustomerPage();
  const { id } = await params;
  const t = await getTransactionForUser(user.id, id).catch((e) => {
    if (e instanceof AppError) notFound();
    throw e;
  });
  const calc = t.calculation as { explanation?: string[] } | null;
  return (
    <div className="animate-fade-in">
      <PageHeader title={t.type === "RETURN" ? "Zwrot towaru" : "Zakupy"} back="/historia?widok=zakupy" subtitle={`${formatDateTime(t.occurredAt)} · ${t.store?.name ?? "Sklep"}`} />
      <Card className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-muted">{t.type === "RETURN" ? "Wartość zwrotu" : "Zapłacono"}</p>
            <p className="font-display text-3xl font-semibold">{formatPLN(t.totalGrosze)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Punkty</p>
            <p className={t.pointsAwarded >= 0 ? "font-display text-3xl font-semibold text-forest-700" : "font-display text-3xl font-semibold text-clay-700"}>
              {t.pointsAwarded > 0 ? "+" : ""}{formatNumber(t.pointsAwarded)}
            </p>
          </div>
        </div>
        {t.status === "VOIDED" && <p className="mt-3"><Badge tone="red">Transakcja anulowana{t.voidReason ? `: ${t.voidReason}` : ""}</Badge></p>}
        <p className="mt-3 font-mono text-xs text-muted">Paragon: {t.externalId}</p>
        {t.originalTransaction && (
          <p className="mt-1 text-sm">Dotyczy zakupów z {formatDateTime(t.originalTransaction.occurredAt)} — <Link className="text-forest-700 underline" href={`/historia/${t.originalTransaction.id}`}>zobacz</Link></p>
        )}
      </Card>

      <SectionTitle>Pozycje</SectionTitle>
      <Card>
        <ul className="divide-y divide-forest-900/5 text-sm">
          {t.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-muted">
                  {i.quantity} × {formatPLN(i.unitPriceGrosze)}
                  {i.discountGrosze > 0 && ` · rabat ${formatPLN(i.discountGrosze)}`}
                  {!i.qualifying && " · bez punktów"}
                  {i.returnedQuantity > 0 && ` · zwrócono ${i.returnedQuantity} szt.`}
                </p>
              </div>
              <span className="shrink-0 font-medium tabular-nums">{formatPLN(i.totalGrosze)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {t.redemptions.length > 0 && (
        <>
          <SectionTitle>Wykorzystane kupony</SectionTitle>
          <Card className="divide-y divide-forest-900/5 text-sm">
            {t.redemptions.map((r) => (
              <div key={r.id} className="flex justify-between px-4 py-3"><span>{r.coupon.title}</span><span className="font-medium">−{formatPLN(r.discountGrosze)}</span></div>
            ))}
          </Card>
        </>
      )}

      {calc?.explanation && calc.explanation.length > 0 && (
        <>
          <SectionTitle>Jak naliczyliśmy punkty</SectionTitle>
          <Card className="p-4 text-sm">
            <ul className="space-y-1">
              {calc.explanation.map((x, i) => <li key={i}>• {x}</li>)}
            </ul>
          </Card>
        </>
      )}

      {t.returns.length > 0 && (
        <>
          <SectionTitle>Zwroty</SectionTitle>
          <Card className="divide-y divide-forest-900/5 text-sm">
            {t.returns.map((r) => (
              <Link key={r.id} href={`/historia/${r.id}`} className="flex justify-between px-4 py-3 hover:bg-forest-50/50">
                <span>{formatDateTime(r.occurredAt)} · {formatPLN(r.totalGrosze)}</span>
                <span className="font-medium text-clay-700">{formatNumber(r.pointsAwarded)} pkt</span>
              </Link>
            ))}
          </Card>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        Coś się nie zgadza? <Link href={`/pomoc?transakcja=${t.id}`} className="font-medium text-forest-700 underline">Zgłoś problem</Link>
      </p>
    </div>
  );
}
