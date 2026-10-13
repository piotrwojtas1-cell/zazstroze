const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

/** Formatuje kwotę w groszach, np. 12345 → "123,45 zł". */
export const formatPLN = (grosze: number) => pln.format(grosze / 100);

/** Parsuje kwotę wpisaną przez człowieka ("12,50", "12.5", "12") do groszy — bez arytmetyki zmiennoprzecinkowej. */
export function parsePLN(input: string): number | null {
  const m = input.trim().replace(/\s|zł/g, "").match(/^(\d{1,9})(?:[.,](\d{1,2}))?$/);
  if (!m) return null;
  const zl = Number(m[1]);
  const gr = Number((m[2] ?? "0").padEnd(2, "0"));
  return zl * 100 + gr;
}

const pts = new Intl.NumberFormat("pl-PL");
export const formatPoints = (p: number) => `${pts.format(p)} pkt`;
export const formatNumber = (n: number) => pts.format(n);

/** Polska odmiana: 1 punkt, 2 punkty, 5 punktów */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}
