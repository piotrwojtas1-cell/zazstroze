import Link from "next/link";
import { cn } from "@/lib/cn";

export function RewardsTabs({ active }: { active: "katalog" | "kupony" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn("flex-1 rounded-lg py-2 text-center text-sm font-semibold transition", on ? "bg-white text-forest-900 shadow-sm" : "text-muted hover:text-forest-800")}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Nagrody i kupony" className="mb-5 flex gap-1 rounded-xl bg-sand p-1">
      {tab("/nagrody", "Katalog nagród", active === "katalog")}
      {tab("/kupony", "Moje kupony", active === "kupony")}
    </nav>
  );
}
