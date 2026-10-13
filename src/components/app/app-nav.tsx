"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Gift, Sprout, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Start", icon: Home, match: (p: string) => p === "/" },
  { href: "/karta", label: "Karta", icon: QrCode, match: (p: string) => p.startsWith("/karta") },
  { href: "/nagrody", label: "Nagrody", icon: Gift, match: (p: string) => p.startsWith("/nagrody") || p.startsWith("/kupony") },
  { href: "/porady", label: "Porady", icon: Sprout, match: (p: string) => p.startsWith("/porady") },
  {
    href: "/profil",
    label: "Profil",
    icon: UserRound,
    match: (p: string) => ["/profil", "/historia", "/lista-zakupow", "/ulubione", "/powiadomienia", "/sklep", "/pomoc"].some((x) => p.startsWith(x)),
  },
];

/** Dolna nawigacja (mobile) — 5 pozycji, duże pola dotyku (≥ 48 px). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Nawigacja główna" className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-900/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          const isCard = href === "/karta";
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition", active ? "text-forest-800" : "text-muted hover:text-forest-700")}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition",
                    isCard ? "size-11 -mt-5 bg-forest-700 text-white shadow-lift ring-4 ring-white" : "h-7 w-12",
                    !isCard && active && "bg-forest-100",
                  )}
                >
                  <Icon className={cn(isCard ? "size-6" : "size-[22px]")} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Nawigacja główna" className="hidden lg:block">
      <ul className="space-y-1">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition", active ? "bg-forest-100 text-forest-900" : "text-muted hover:bg-forest-50 hover:text-forest-800")}
              >
                <Icon className="size-5" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
