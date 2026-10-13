import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { listTransactions } from "@/server/services/admin";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { formatPLN } from "@/lib/money";
import { formatCardNumber } from "@/lib/luhn";

export const metadata = { title: "Transakcje" };

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ typ?: string; status?: string; q?: string }> }) {
  await requireStaffPage("transactions.view");
  const sp = await searchParams;
  const type = sp.typ === "SALE" || sp.typ === "RETURN" ? sp.typ : undefined;
  const status = sp.status === "COMPLETED" || sp.status === "VOIDED" ? sp.status : undefined;
  const list = await listTransactions({ type, status, q: sp.q?.slice(0, 80) });
  return (
    <>
      <AdminHeader title="Transakcje" description="Sprzedaże, zwroty i anulowania przesłane przez systemy kasowe" />
      <form className="mb-5 grid gap-3 sm:grid-cols-4">
        <input name="q" defaultValue={sp.q} placeholder="Nr paragonu lub karty" className="input sm:col-span-2" aria-label="Szukaj" />
        <select name="typ" defaultValue={type ?? ""} className="input" aria-label="Typ">
          <option value="">Wszystkie typy</option>
          <option value="SALE">Sprzedaż</option>
          <option value="RETURN">Zwrot</option>
        </select>
        <div className="flex gap-2">
          <select name="status" defaultValue={status ?? ""} className="input" aria-label="Status">
            <option value="">Każdy status</option>
            <option value="COMPLETED">Zakończona</option>
            <option value="VOIDED">Anulowana</option>
          </select>
          <button className="rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white">Filtruj</button>
        </div>
      </form>
      {list.length === 0 ? (
        <EmptyState icon="🧾" title="Brak transakcji" />
      ) : (
        <Table>
          <thead><tr><th>Data</th><th>Paragon</th><th>Klient / karta</th><th>Źródło</th><th>Typ</th><th className="text-right">Kwota</th><th className="text-right">Punkty</th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(t.occurredAt)}</td>
                <td className="font-mono text-xs"><Link href={`/admin/transakcje/${t.id}`} className="text-forest-700 hover:underline">{t.externalId}</Link></td>
                <td>
                  {[t.card.user.profile?.firstName, t.card.user.profile?.lastName].filter(Boolean).join(" ")}
                  <p className="font-mono text-[11px] text-muted">{formatCardNumber(t.card.number)}</p>
                </td>
                <td className="text-xs">{t.integration.name}</td>
                <td>{t.type === "RETURN" ? <Badge tone="clay">Zwrot</Badge> : t.status === "VOIDED" ? <Badge tone="red">Anulowana</Badge> : <Badge>Sprzedaż</Badge>}</td>
                <td className="text-right tabular-nums">{formatPLN(t.totalGrosze)}</td>
                <td className="text-right tabular-nums">{t.pointsAwarded}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
