/**
 * Rozkłada rabat (w groszach) proporcjonalnie na pozycje — metodą największych reszt,
 * tak aby suma części była dokładnie równa rabatowi, a żadna pozycja nie zeszła poniżej zera.
 */
export function allocateDiscount(lineTotals: number[], eligible: boolean[], discount: number): number[] {
  const base = lineTotals.map((t, i) => (eligible[i] ? t : 0));
  const sum = base.reduce((a, b) => a + b, 0);
  if (discount <= 0 || sum <= 0) return lineTotals.map(() => 0);
  const capped = Math.min(discount, sum);
  const raw = base.map((b) => (b * capped) / sum);
  const parts = raw.map(Math.floor);
  let rest = capped - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    if (parts[i]! < base[i]!) {
      parts[i]! += 1;
      rest -= 1;
    }
  }
  return parts;
}
