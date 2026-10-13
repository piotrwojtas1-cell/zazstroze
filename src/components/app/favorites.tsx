"use client";

import { useState } from "react";
import { Heart, ShoppingBasket } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatPLN } from "@/lib/money";

export function FavoritesView({ products, favoriteIds }: { products: { id: string; name: string; emoji: string; priceGrosze: number }[]; favoriteIds: string[] }) {
  const toast = useToast();
  const [favs, setFavs] = useState(new Set(favoriteIds));
  const [onlyFavs, setOnlyFavs] = useState(favoriteIds.length > 0);

  async function toggle(id: string) {
    const on = !favs.has(id);
    setFavs((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    try {
      await api(`/api/v1/me/favorites/${id}`, { method: on ? "PUT" : "DELETE" });
    } catch {
      toast("Nie udało się zapisać.", "error");
    }
  }
  async function addToList(id: string) {
    try {
      await api("/api/v1/me/shopping-list", { body: { productId: id } });
      toast("Dodano do listy zakupów.");
    } catch {
      toast("Nie udało się dodać.", "error");
    }
  }

  const shown = onlyFavs ? products.filter((p) => favs.has(p.id)) : products;
  return (
    <div>
      <div className="mb-4 flex gap-2" role="group" aria-label="Widok">
        <button type="button" aria-pressed={onlyFavs} onClick={() => setOnlyFavs(true)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium ring-1", onlyFavs ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}>Ulubione ({favs.size})</button>
        <button type="button" aria-pressed={!onlyFavs} onClick={() => setOnlyFavs(false)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium ring-1", !onlyFavs ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}>Wszystkie produkty</button>
      </div>
      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">Nie masz jeszcze ulubionych. Przejdź do „Wszystkie produkty” i dotknij serduszka.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((p) => (
            <li key={p.id} className="card flex items-center gap-3 p-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-2xl" aria-hidden>{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted">{formatPLN(p.priceGrosze)}</p>
              </div>
              <button type="button" onClick={() => addToList(p.id)} className="rounded-lg p-2 text-forest-700 hover:bg-forest-50" aria-label={`Dodaj do listy: ${p.name}`}>
                <ShoppingBasket className="size-5" aria-hidden />
              </button>
              <button type="button" onClick={() => toggle(p.id)} aria-pressed={favs.has(p.id)} className="rounded-lg p-2 hover:bg-clay-50" aria-label={`Ulubiony: ${p.name}`}>
                <Heart className={cn("size-5", favs.has(p.id) ? "fill-clay-500 text-clay-500" : "text-muted")} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">Ceny orientacyjne — aktualne ceny w sklepie.</p>
    </div>
  );
}
