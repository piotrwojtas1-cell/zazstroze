/**
 * Prosty wykres słupkowy (jedna seria, jeden odcień) z tabelą danych dla czytników ekranu.
 * Słupki: zaokrąglone końce danych, 2 px odstępu, etykiety tylko dla min/maks i ostatniego słupka; podpowiedź po najechaniu.
 */
export function BarChart({ title, data, format }: { title: string; data: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const maxIdx = data.findIndex((d) => d.value === max);
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold text-ink">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-sm text-muted">Brak danych w wybranym okresie.</p>
      ) : (
        <>
          <div className="flex h-44 items-end gap-[2px] border-b border-forest-900/15" aria-hidden="true">
            {data.map((d, i) => (
              <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
                {(i === maxIdx || i === data.length - 1) && (
                  <span className="mb-1 text-center text-[10px] font-medium tabular-nums text-muted">{format(d.value)}</span>
                )}
                <div className="min-h-[2px] rounded-t-[4px] bg-forest-500 transition group-hover:bg-forest-700" style={{ height: `${(d.value / max) * 100}%` }} />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-forest-950 px-2 py-1 text-xs text-white shadow-lift group-hover:block">
                  {d.label}: {format(d.value)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted" aria-hidden="true">
            <span>{data[0]!.label}</span>
            <span>{data.at(-1)!.label}</span>
          </div>
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted">Pokaż dane w tabeli</summary>
            <table className="mt-2 w-full">
              <tbody>
                {data.map((d) => (
                  <tr key={d.label} className="border-b border-forest-900/5"><td className="py-1">{d.label}</td><td className="py-1 text-right tabular-nums">{format(d.value)}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
