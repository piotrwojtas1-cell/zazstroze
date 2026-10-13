import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { requireCustomerPage } from "@/server/auth/current";
import { getMainStore } from "@/server/services/content";
import { PageHeader, Card, EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Sklep i kontakt" };

export default async function StorePage() {
  await requireCustomerPage();
  const store = await getMainStore();
  if (!store) return <EmptyState icon="🏪" title="Brak danych sklepu" />;
  const hours = store.openingHours as { days: string; hours: string }[];
  return (
    <div className="animate-fade-in">
      <PageHeader title="Sklep i kontakt" back="/profil" />
      <Card className="overflow-hidden">
        <div className="leaf-pattern flex h-32 items-end bg-gradient-to-br from-forest-700 to-forest-900 p-5">
          <h2 className="text-xl font-semibold text-white">{store.name}</h2>
        </div>
        <ul className="divide-y divide-forest-900/5 text-[15px]">
          <li className="flex gap-3 p-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-forest-700" aria-hidden />
            <div>
              <p>{store.street}</p>
              <p>{store.postalCode} {store.city}</p>
              {store.latitude && store.longitude && (
                <a className="mt-1 inline-block text-sm font-medium text-forest-700 underline" href={`https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=17/${store.latitude}/${store.longitude}`} target="_blank" rel="noopener noreferrer">
                  Pokaż na mapie
                </a>
              )}
            </div>
          </li>
          <li className="flex gap-3 p-4">
            <Phone className="size-5 shrink-0 text-forest-700" aria-hidden />
            <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="font-medium text-forest-800 underline-offset-2 hover:underline">{store.phone}</a>
          </li>
          <li className="flex gap-3 p-4">
            <Mail className="size-5 shrink-0 text-forest-700" aria-hidden />
            <a href={`mailto:${store.email}`} className="font-medium text-forest-800 underline-offset-2 hover:underline">{store.email}</a>
          </li>
          <li className="flex gap-3 p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-forest-700" aria-hidden />
            <dl className="w-full space-y-1">
              {hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-3">
                  <dt className="text-muted">{h.days}</dt>
                  <dd className="font-medium">{h.hours}</dd>
                </div>
              ))}
            </dl>
          </li>
        </ul>
      </Card>
      <p className="mt-4 text-xs text-muted">Dane sklepu są przykładowe (tryb demonstracyjny).</p>
    </div>
  );
}
