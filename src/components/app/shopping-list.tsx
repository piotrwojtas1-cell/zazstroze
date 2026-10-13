"use client";

import { useState } from "react";
import { Plus, Trash2, ShoppingBasket, Minus } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { EmptyState, Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

interface Item {
  id: string;
  text: string;
  quantity: number;
  done: boolean;
  emoji: string | null;
}

export function ShoppingList({ initial, products }: { initial: Item[]; products: { id: string; name: string; emoji: string }[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const suggestions = text.length >= 2 ? products.filter((p) => p.name.toLowerCase().includes(text.toLowerCase())).slice(0, 5) : [];

  async function add(body: { text?: string; productId?: string }) {
    setAdding(true);
    try {
      const { item } = await api<{ item: { id: string; text: string; quantity: number; done: boolean } }>("/api/v1/me/shopping-list", { body });
      const p = products.find((x) => x.id === body.productId);
      setItems((l) => [{ ...item, emoji: p?.emoji ?? null }, ...l]);
      setText("");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nie udało się dodać pozycji.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function patch(id: string, data: Partial<Pick<Item, "done" | "quantity">>) {
    const prev = items;
    setItems((l) => l.map((i) => (i.id === id ? { ...i, ...data } : i)));
    try {
      await api(`/api/v1/me/shopping-list/${id}`, { method: "PATCH", body: data });
    } catch {
      setItems(prev);
      toast("Nie udało się zapisać zmiany.", "error");
    }
  }

  async function remove(id: string) {
    const prev = items;
    setItems((l) => l.filter((i) => i.id !== id));
    try {
      await api(`/api/v1/me/shopping-list/${id}`, { method: "DELETE" });
    } catch {
      setItems(prev);
    }
  }

  async function clearDone() {
    await api("/api/v1/me/shopping-list/clear-done", { method: "POST" });
    setItems((l) => l.filter((i) => !i.done));
    toast("Usunięto kupione pozycje.");
  }

  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done));
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void add({ text: text.trim() });
        }}
        className="relative mb-4 flex gap-2"
      >
        <label htmlFor="new-item" className="sr-only">Dodaj produkt</label>
        <input id="new-item" value={text} onChange={(e) => setText(e.target.value)} placeholder="Np. ziemia do borówek" className="input" maxLength={120} autoComplete="off" />
        <Button type="submit" loading={adding} aria-label="Dodaj do listy"><Plus className="size-5" aria-hidden /></Button>
        {suggestions.length > 0 && (
          <ul className="absolute left-0 right-14 top-full z-10 mt-1 overflow-hidden rounded-xl bg-white shadow-lift ring-1 ring-forest-900/10" role="listbox" aria-label="Podpowiedzi produktów">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add({ productId: p.id })} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-forest-50">
                  <span aria-hidden>{p.emoji}</span> {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>
      {items.length === 0 ? (
        <EmptyState icon={<ShoppingBasket className="size-7" />} title="Lista jest pusta" description="Dodaj produkty, które chcesz kupić przy następnej wizycie." />
      ) : (
        <>
          <Card>
            <ul className="divide-y divide-forest-900/5">
              {sorted.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input type="checkbox" checked={i.done} onChange={(e) => patch(i.id, { done: e.target.checked })} className="size-5 accent-forest-700" aria-label={`Kupione: ${i.text}`} />
                  <span className={cn("flex-1 text-[15px]", i.done && "text-muted line-through")}>
                    {i.emoji && <span className="mr-1.5" aria-hidden>{i.emoji}</span>}
                    {i.text}
                  </span>
                  <div className="flex items-center gap-1">
                    <button type="button" className="rounded-lg p-1.5 hover:bg-forest-50 disabled:opacity-30" onClick={() => patch(i.id, { quantity: i.quantity - 1 })} disabled={i.quantity <= 1} aria-label={`Zmniejsz ilość: ${i.text}`}><Minus className="size-4" aria-hidden /></button>
                    <span className="w-6 text-center text-sm tabular-nums">{i.quantity}</span>
                    <button type="button" className="rounded-lg p-1.5 hover:bg-forest-50" onClick={() => patch(i.id, { quantity: i.quantity + 1 })} aria-label={`Zwiększ ilość: ${i.text}`}><Plus className="size-4" aria-hidden /></button>
                  </div>
                  <button type="button" onClick={() => remove(i.id)} className="rounded-lg p-2 text-muted hover:bg-danger-50 hover:text-danger-700" aria-label={`Usuń: ${i.text}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {doneCount > 0 && <div className="mt-3 text-right"><Button variant="ghost" size="sm" onClick={clearDone}>Usuń kupione ({doneCount})</Button></div>}
        </>
      )}
    </div>
  );
}
