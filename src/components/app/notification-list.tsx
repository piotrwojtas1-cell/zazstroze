"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellOff, Megaphone, Receipt, Info } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/dates";

interface Item {
  id: string;
  title: string;
  body: string;
  link: string | null;
  category: "TRANSACTIONAL" | "MARKETING" | "SYSTEM";
  read: boolean;
  createdAt: string;
}

const ICONS = { TRANSACTIONAL: Receipt, MARKETING: Megaphone, SYSTEM: Info };
const LABELS = { TRANSACTIONAL: "Konto", MARKETING: "Oferta", SYSTEM: "Informacja" };

export function NotificationList({ items, unread }: { items: Item[]; unread: number }) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [filter, setFilter] = useState<"all" | "TRANSACTIONAL" | "MARKETING">("all");

  async function read(id: string) {
    setList((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await api(`/api/v1/me/notifications/${id}/read`, { method: "POST" }).catch(() => undefined);
    router.refresh();
  }
  async function readAll() {
    setList((l) => l.map((n) => ({ ...n, read: true })));
    await api("/api/v1/me/notifications/read-all", { method: "POST" }).catch(() => undefined);
    router.refresh();
  }

  if (list.length === 0) return <EmptyState icon={<BellOff className="size-7" />} title="Brak powiadomień" description="Tu pojawią się informacje o punktach, kuponach i ofertach." />;
  const shown = list.filter((n) => filter === "all" || n.category === filter || (filter === "TRANSACTIONAL" && n.category === "SYSTEM"));
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex gap-2" role="group" aria-label="Filtr">
          {(["all", "TRANSACTIONAL", "MARKETING"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium ring-1", filter === f ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}>
              {f === "all" ? "Wszystkie" : f === "TRANSACTIONAL" ? "Konto" : "Oferty"}
            </button>
          ))}
        </div>
        {unread > 0 && <Button variant="ghost" size="sm" onClick={readAll}>Oznacz wszystkie</Button>}
      </div>
      <ul className="space-y-2">
        {shown.map((n) => {
          const Icon = ICONS[n.category];
          const body = (
            <div className={cn("card flex gap-3 p-4 transition", !n.read && "ring-2 ring-forest-600/25")}>
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", n.category === "MARKETING" ? "bg-clay-50 text-clay-700" : "bg-forest-50 text-forest-700")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-clay-500" aria-label="Nieprzeczytane" />}
                </div>
                <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{LABELS[n.category]} · {formatDateTime(n.createdAt)}</p>
              </div>
            </div>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} onClick={() => !n.read && read(n.id)} className="block">{body}</Link>
              ) : (
                <button type="button" onClick={() => !n.read && read(n.id)} className="block w-full text-left">{body}</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
