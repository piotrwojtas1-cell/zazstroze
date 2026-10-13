import { requireCustomerPage } from "@/server/auth/current";
import { listFavorites, listProducts } from "@/server/services/shopping";
import { PageHeader } from "@/components/ui/misc";
import { FavoritesView } from "@/components/app/favorites";

export const metadata = { title: "Ulubione produkty" };

export default async function FavoritesPage() {
  const user = await requireCustomerPage();
  const [favorites, products] = await Promise.all([listFavorites(user.id), listProducts()]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Ulubione produkty" back="/profil" subtitle="Zapisz produkty, do których często wracasz" />
      <FavoritesView
        favoriteIds={favorites.map((f) => f.productId)}
        products={products.filter((p) => !["karty-podarunkowe", "kaucje"].includes(p.category)).map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, priceGrosze: p.priceGrosze }))}
      />
    </div>
  );
}
