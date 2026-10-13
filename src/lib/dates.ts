const TZ = "Europe/Warsaw";

export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(d));

export const formatDateShort = (d: Date | string) =>
  new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(new Date(d));

export const formatDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(d));

export const MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
] as const;

export const MONTHS_GENITIVE = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
] as const;

/** Bieżący miesiąc (1–12) w strefie Europe/Warsaw. */
export function currentMonth(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { month: "numeric", timeZone: TZ }).format(now));
}

export function daysUntil(d: Date, now = new Date()): number {
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export function greeting(now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
  if (h < 5) return "Dobry wieczór";
  if (h < 18) return "Dzień dobry";
  return "Dobry wieczór";
}
