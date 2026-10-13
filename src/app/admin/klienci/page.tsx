import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaffPage } from "@/server/auth/current";
import { searchCustomers } from "@/server/services/admin";
import { AdminHeader, Table } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { formatCardNumber } from "@/lib/luhn";
import { formatDate } from "@/lib/dates";
import { formatNumber } from "@/lib/money";

export const metadata = { title: "Klienci" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaffPage("customers.view");
  const { q } = await searchParams;
  const customers = await searchCustomers(q?.slice(0, 80), 50);
  return (
    <>
      <AdminHeader title="Klienci" description="Wyszukaj po imieniu, nazwisku, e-mailu, telefonie lub numerze karty" />
      <form role="search" className="relative mb-5 max-w-xl">
        <label htmlFor="q" className="sr-only">Szukaj klienta</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input id="q" name="q" defaultValue={q} placeholder="np. Zielińska, 2900 3409…" className="input pl-11" />
      </form>
      {customers.length === 0 ? (
        <EmptyState icon="🔍" title="Brak wyników" description="Zmień kryteria wyszukiwania." />
      ) : (
        <Table>
          <thead>
            <tr><th>Klient</th><th>Numer karty</th><th>Poziom</th><th className="text-right">Saldo</th><th>Status</th><th>Od</th></tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-forest-50/40">
                <td>
                  <Link href={`/admin/klienci/${c.id}`} className="font-medium text-forest-800 hover:underline">
                    {[c.profile?.firstName, c.profile?.lastName].filter(Boolean).join(" ")}
                  </Link>
                  <p className="text-xs text-muted">{c.email}</p>
                </td>
                <td className="font-mono text-xs">{c.card ? formatCardNumber(c.card.number) : "—"}</td>
                <td>{c.card?.tier?.name ?? "—"}</td>
                <td className="text-right tabular-nums">{formatNumber(c.card?.pointsBalance ?? 0)}</td>
                <td>
                  {c.status === "DELETED" ? <Badge tone="gray">Usunięte</Badge> : c.card?.status === "BLOCKED" ? <Badge tone="red">Karta zablokowana</Badge> : <Badge>Aktywne</Badge>}
                </td>
                <td className="whitespace-nowrap text-muted">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
