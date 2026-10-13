import { requireCustomerPage } from "@/server/auth/current";
import { listShoppingItems, listProducts } from "@/server/services/shopping";
import { PageHeader } from "@/components/ui/misc";
import { ShoppingList } from "@/components/app/shopping-list";

export const metadata = { title: "Lista zakupów" };

export default async function ShoppingListPage() {
  const user = await requireCustomerPage();
  const [items, products] = await Promise.all([listShoppingItems(user.id), listProducts()]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Lista zakupów" back="/profil" subtitle="Zaplanuj wizytę w sklepie" />
      <ShoppingList
        initial={items.map((i) => ({ id: i.id, text: i.text, quantity: i.quantity, done: i.done, emoji: i.product?.emoji ?? null }))}
        products={products.filter((p) => !["karty-podarunkowe", "kaucje"].includes(p.category)).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji }))}
      />
    </div>
  );
}
