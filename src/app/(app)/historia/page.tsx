import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { requireCustomerPage } from "@/server/auth/current";
import { getHistory, getPurchases } from "@/server/services/customer";
import { PageHeader, EmptyState, Card, Badge } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDate } from "@/lib/dates";
import { formatNumber, formatPLN } from "@/lib/money";
import { LEDGER_LABELS } from "@/lib/loyalty-format";

export const metadata = { title: "Historia" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ widok?: string; od?: string }> }) {
  const user = await requireCustomerPage();
  const { widok, od } = await searchParams;
  const purchasesView = widok === "zakupy";

  const tab = (href: string, label: string, on: boolean) => (
    <Link href={href} aria-current={on ? "page" : undefined} className={cn("flex-1 rounded-lg py-2 text-center text-sm font-semibold", on ? "bg-white text-forest-900 shadow-sm" : "text-muted")}>
      {label}
    </Link>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Historia" back="/profil" />
      <nav aria-label="Rodzaj historii" className="mb-5 flex gap-1 rounded-xl bg-sand p-1">
        {tab("/historia", "Punkty", !purchasesView)}
        {tab("/historia?widok=zakupy", "Zakupy", purchasesView)}
      </nav>
      {purchasesView ? <Purchases userId={user.id} /> : <Ledger userId={user.id} cursor={od} />}
    </div>
  );
}

async function Ledger({ userId, cursor }: { userId: string; cursor?: string }) {
  const { entries, nextCursor, balance } = await getHistory(userId, { cursor, take: 30 });
  if (entries.length === 0) {
    return <EmptyState icon="🌱" title="Brak operacji" description="Pokaż kartę przy kasie, a punkty za zakupy pojawią się tutaj." action={<ButtonLink href="/karta">Pokaż kartę</ButtonLink>} />;
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted">Aktualne saldo: <strong className="text-forest-800">{formatNumber(balance)} pkt</strong></p>
      <Card>
        <ul className="divide-y divide-forest-900/5" data-testid="ledger-list">
          {entries.map((e) => {
            const positive = e.points > 0;
            const content = (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", positive ? "bg-forest-50 text-forest-700" : "bg-clay-50 text-clay-700")} aria-hidden>
                  {positive ? "+" : "−"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.reason}</p>
                  <p className="text-xs text-muted">{LEDGER_LABELS[e.type]} · {formatDateTime(e.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-semibold tabular-nums", positive ? "text-forest-700" : "text-clay-700")}>{positive ? "+" : ""}{formatNumber(e.points)}</p>
                  <p className="text-xs text-muted tabular-nums">saldo {formatNumber(e.balanceAfter)}</p>
                </div>
              </div>
            );
            return <li key={e.id}>{e.transaction ? <Link href={`/historia/${e.transaction.id}`} className="block hover:bg-forest-50/50">{content}</Link> : content}</li>;
          })}
        </ul>
      </Card>
      {nextCursor && (
        <div className="mt-4 text-center">
          <ButtonLink href={`/historia?od=${nextCursor}`} variant="outline">Starsze operacje</ButtonLink>
        </div>
      )}
    </>
  );
}

async function Purchases({ userId }: { userId: string }) {
  const list = await getPurchases(userId);
  if (list.length === 0) return <EmptyState icon={<Receipt className="size-7" />} title="Brak zakupów" description="Zakupy zarejestrowane z Twoją kartą pojawią się tutaj." />;
  return (
    <Card>
      <ul className="divide-y divide-forest-900/5">
        {list.map((t) => (
          <li key={t.id}>
            <Link href={`/historia/${t.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-forest-50/50">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-700"><Receipt className="size-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {t.type === "RETURN" ? "Zwrot" : "Zakupy"} · {formatPLN(t.totalGrosze)}
                  {t.status === "VOIDED" && <Badge tone="red" className="ml-2">Anulowana</Badge>}
                </p>
                <p className="text-xs text-muted">{formatDate(t.occurredAt)} · {t.store?.name ?? "Sklep"} · {t._count.items} poz.</p>
              </div>
              <span className={cn("text-sm font-semibold tabular-nums", t.pointsAwarded >= 0 ? "text-forest-700" : "text-clay-700")}>
                {t.pointsAwarded > 0 ? "+" : ""}{formatNumber(t.pointsAwarded)} pkt
              </span>
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
