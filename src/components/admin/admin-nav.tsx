"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ScanLine, Receipt, Gift, Megaphone, BookOpen, SlidersHorizontal, MessageSquareWarning, BarChart3, ShieldCheck, PlugZap, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const ADMIN_NAV = [
  { href: "/admin", label: "Pulpit", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/admin/kasa", label: "Kasa demo", icon: ScanLine, permission: "pos.operate" },
  { href: "/admin/klienci", label: "Klienci", icon: Users, permission: "customers.view" },
  { href: "/admin/transakcje", label: "Transakcje", icon: Receipt, permission: "transactions.view" },
  { href: "/admin/reklamacje", label: "Reklamacje", icon: MessageSquareWarning, permission: "complaints.manage" },
  { href: "/admin/nagrody", label: "Nagrody", icon: Gift, permission: "rewards.manage" },
  { href: "/admin/kampanie", label: "Kampanie", icon: Megaphone, permission: "campaigns.manage" },
  { href: "/admin/tresci", label: "Porady i kalendarz", icon: BookOpen, permission: "content.manage" },
  { href: "/admin/raporty", label: "Raporty", icon: BarChart3, permission: "reports.view" },
  { href: "/admin/program", label: "Reguły programu", icon: SlidersHorizontal, permission: "config.manage" },
  { href: "/admin/zespol", label: "Zespół i role", icon: ShieldCheck, permission: "roles.manage" },
  { href: "/admin/integracje", label: "Integracje POS", icon: PlugZap, permission: "integrations.manage" },
  { href: "/admin/audyt", label: "Dziennik audytu", icon: ScrollText, permission: "audit.view" },
] as const;

export function AdminNav({ permissions, onNavigate }: { permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel administracyjny">
      <ul className="space-y-0.5">
        {ADMIN_NAV.filter((i) => permissions.includes(i.permission)).map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-white/12 text-white" : "text-forest-100/80 hover:bg-white/5 hover:text-white")}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
