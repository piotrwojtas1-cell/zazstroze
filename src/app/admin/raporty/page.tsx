import { requireStaffPage } from "@/server/auth/current";
import { programReport, balanceIntegrityCheck } from "@/server/services/reports";
import { AdminHeader, Panel, Stat, Table } from "@/components/admin/ui";
import { BarChart } from "@/components/admin/bar-chart";
import { Alert } from "@/components/ui/misc";
import { formatNumber, formatPLN } from "@/lib/money";

export const metadata = { title: "Raporty" };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ od?: string; do?: string }> }) {
  await requireStaffPage("reports.view");
  const sp = await searchParams;
  const toDay = sp.do && /^\d{4}-\d{2}-\d{2}$/.test(sp.do) ? new Date(`${sp.do}T00:00:00Z`) : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const fromDay = sp.od && /^\d{4}-\d{2}-\d{2}$/.test(sp.od) ? new Date(`${sp.od}T00:00:00Z`) : new Date(toDay.getTime() - 180 * 86_400_000);
  const to = new Date(toDay.getTime() + 86_400_000); // włącznie z dniem końcowym
  const [r, integrity] = await Promise.all([programReport({ from: fromDay, to }), balanceIntegrityCheck()]);

  return (
    <>
      <AdminHeader title="Raporty programu" description="Rejestracje, aktywność, wykorzystanie nagród i koszty" />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className="label mb-1">Od</span><input type="date" name="od" defaultValue={iso(fromDay)} className="input" /></label>
        <label className="text-sm"><span className="label mb-1">Do</span><input type="date" name="do" defaultValue={iso(toDay)} className="input" /></label>
        <button className="h-11 rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white">Pokaż</button>
      </form>

      {integrity.length > 0 && <div className="mb-4"><Alert tone="error">Niespójność salda na {integrity.length} kartach — saldo różni się od sumy rejestru.</Alert></div>}

      <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wide text-muted">Aktywność</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Nowe rejestracje" value={formatNumber(r.registrations.total)} />
        <Stat label="Aktywni klienci" value={formatNumber(r.activity.activeCustomers)} hint="≥ 1 zakup w okresie" />
        <Stat label="Sprzedaż z kartą" value={formatPLN(r.activity.salesValueGrosze)} hint={`${formatNumber(r.activity.salesCount)} paragonów`} />
        <Stat label="Średni koszyk" value={formatPLN(r.activity.avgBasketGrosze)} />
        <Stat label="Zakupy na klienta" value={r.activity.avgPurchasesPerCustomer.toLocaleString("pl-PL")} />
        <Stat label="Zwroty" value={formatNumber(r.activity.returnsCount)} hint={formatPLN(r.activity.returnsValueGrosze)} />
        <Stat label="Anulowane" value={formatNumber(r.activity.voidedCount)} />
        <Stat label="Kupony użyte" value={formatNumber(r.cost.couponsUsed)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Rejestracje tygodniowo">
          <BarChart title="Liczba nowych kont (tydzień od)" data={r.registrations.byWeek.map((w) => ({ label: w.week, value: w.count }))} format={(v) => formatNumber(v)} />
        </Panel>
        <Panel title="Średnia wartość koszyka">
          <BarChart title="Średni koszyk w miesiącu" data={r.activity.monthly.map((m) => ({ label: m.month, value: m.avgBasketGrosze }))} format={formatPLN} />
        </Panel>
        <Panel title="Częstotliwość zakupów">
          <BarChart title="Liczba klientów wg liczby zakupów w okresie" data={r.activity.frequency.map((f) => ({ label: `${f.bucket} zak.`, value: f.customers }))} format={(v) => formatNumber(v)} />
        </Panel>
        <Panel title="Punkty i koszt programu">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">Wydane (zakupy + bonusy)</dt><dd className="text-right font-semibold tabular-nums">{formatNumber(r.points.issued)}</dd>
            <dt className="text-muted">Cofnięte (zwroty/anulowania)</dt><dd className="text-right tabular-nums">{formatNumber(r.points.reversed)}</dd>
            <dt className="text-muted">Wymienione na nagrody</dt><dd className="text-right tabular-nums">{formatNumber(r.points.redeemed)}</dd>
            <dt className="text-muted">Zwrócone za anulowane kupony</dt><dd className="text-right tabular-nums">{formatNumber(r.points.redeemReversed)}</dd>
            <dt className="text-muted">Korekty ręczne (netto)</dt><dd className="text-right tabular-nums">{formatNumber(r.points.adjustmentsNet)}</dd>
            <dt className="text-muted">Saldo punktów klientów (dziś)</dt><dd className="text-right font-semibold tabular-nums">{formatNumber(r.points.outstanding)}</dd>
            <dt className="border-t border-forest-900/10 pt-2 text-muted">Rabaty z kuponów (koszt rzeczywisty)</dt><dd className="border-t border-forest-900/10 pt-2 text-right font-semibold tabular-nums">{formatPLN(r.cost.couponDiscountsGrosze)}</dd>
            <dt className="text-muted">Wartość wydanych punktów (szac.)</dt><dd className="text-right tabular-nums">{formatPLN(r.cost.issuedValueEstimateGrosze)}</dd>
            <dt className="text-muted">Zobowiązanie z sald (szac.)</dt><dd className="text-right tabular-nums">{formatPLN(r.cost.liabilityEstimateGrosze)}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted">Szacunki wg informacyjnej wartości punktu {formatPLN(r.cost.pointValueGrosze)} z konfiguracji — nie są wartością księgową.</p>
        </Panel>
      </div>

      <h2 className="mb-3 mt-8 font-sans text-sm font-semibold uppercase tracking-wide text-muted">Wykorzystanie nagród</h2>
      <Table>
        <thead><tr><th>Nagroda</th><th className="text-right">Wymiany</th><th className="text-right">Użyte kupony</th><th className="text-right">Wydane punkty</th></tr></thead>
        <tbody>
          {r.rewards.map((x) => (
            <tr key={x.id}><td>{x.name}</td><td className="text-right tabular-nums">{x.redeemed}</td><td className="text-right tabular-nums">{x.used}</td><td className="text-right tabular-nums">{formatNumber(x.pointsSpent)}</td></tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
