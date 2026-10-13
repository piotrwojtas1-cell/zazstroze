import Link from "next/link";
import { History, ShoppingBasket, Heart, Bell, Store, LifeBuoy, FileText, ShieldCheck, UserRound, Sprout, KeyRound, ChevronRight } from "lucide-react";
import { requireCustomerPage } from "@/server/auth/current";
import { getProfile } from "@/server/services/customer";
import { Card } from "@/components/ui/misc";
import { LogoutButton } from "@/components/app/logout-button";
import { formatCardNumber } from "@/lib/luhn";
import { formatDate } from "@/lib/dates";

export const metadata = { title: "Profil" };

const GROUPS = [
  {
    title: "Konto",
    items: [
      { href: "/profil/dane", label: "Moje dane", icon: UserRound },
      { href: "/profil/zainteresowania", label: "Zainteresowania", icon: Sprout },
      { href: "/profil/prywatnosc", label: "Prywatność i zgody", icon: ShieldCheck },
      { href: "/profil/haslo", label: "Zmiana hasła", icon: KeyRound },
    ],
  },
  {
    title: "Zakupy",
    items: [
      { href: "/historia", label: "Historia zakupów i punktów", icon: History },
      { href: "/lista-zakupow", label: "Lista zakupów", icon: ShoppingBasket },
      { href: "/ulubione", label: "Ulubione produkty", icon: Heart },
      { href: "/powiadomienia", label: "Powiadomienia", icon: Bell },
    ],
  },
  {
    title: "Sklep i pomoc",
    items: [
      { href: "/sklep", label: "Sklep i kontakt", icon: Store },
      { href: "/pomoc", label: "Pomoc i reklamacje", icon: LifeBuoy },
      { href: "/regulamin", label: "Regulamin programu", icon: FileText },
      { href: "/polityka-prywatnosci", label: "Polityka prywatności", icon: ShieldCheck },
    ],
  },
];

export default async function ProfilePage() {
  const user = await requireCustomerPage();
  const u = await getProfile(user.id);
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-forest-700 font-display text-2xl font-semibold text-white" aria-hidden>
          {(u.profile?.firstName ?? "?").slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{[u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ")}</h1>
          <p className="truncate text-sm text-muted">{u.email}</p>
          {u.card && <p className="mt-0.5 font-mono text-xs text-muted">Karta {formatCardNumber(u.card.number)} · od {formatDate(u.createdAt)}</p>}
        </div>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title} className="mt-6" aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="mb-2 px-1 font-sans text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</h2>
          <Card>
            <ul className="divide-y divide-forest-900/5">
              {g.items.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="flex min-h-14 items-center gap-3 px-4 hover:bg-forest-50/60">
                    <Icon className="size-5 text-forest-700" aria-hidden />
                    <span className="flex-1 text-[15px] font-medium">{label}</span>
                    <ChevronRight className="size-5 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ))}
      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  );
}
