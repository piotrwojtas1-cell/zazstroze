import { requireCustomerPage } from "@/server/auth/current";
import { listMyComplaints, STATUS_LABELS } from "@/server/services/complaints";
import { getPurchases } from "@/server/services/customer";
import { PageHeader, Card, SectionTitle, Badge } from "@/components/ui/misc";
import { ComplaintForm } from "@/components/app/complaint-form";
import { formatDate } from "@/lib/dates";
import { formatPLN } from "@/lib/money";

export const metadata = { title: "Pomoc" };

const FAQ = [
  { q: "Jak zbierać punkty?", a: "Pokaż kod QR z zakładki „Karta” przy kasie przed zapłatą. Punkty naliczymy automatycznie po zakończeniu transakcji." },
  { q: "Ile punktów dostanę?", a: "Liczbę punktów za zakupy określa aktualna konfiguracja programu (w wersji demonstracyjnej: 1 pkt za każdą złotówkę). Punktów nie naliczamy za karty podarunkowe i kaucje. Szczegóły widać w historii każdego paragonu." },
  { q: "Zapomniałem pokazać karty. Co teraz?", a: "Zgłoś problem poniżej w ciągu 14 dni i zachowaj paragon. Pracownik sklepu zweryfikuje transakcję i doliczy punkty." },
  { q: "Jak użyć kuponu?", a: "Aktywuj kupon w zakładce „Moje kupony” — kasa zastosuje go automatycznie po zeskanowaniu karty. Możesz też podać kod kuponu kasjerowi." },
  { q: "Co się dzieje z punktami po zwrocie towaru?", a: "Odejmujemy punkty naliczone za zwrócone produkty. Jeśli punkty zostały już wydane, saldo może być chwilowo ujemne." },
  { q: "Czy punkty wygasają?", a: "W obecnej konfiguracji punkty nie wygasają. Kupony mają datę ważności widoczną w aplikacji." },
];

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ transakcja?: string }> }) {
  const user = await requireCustomerPage();
  const { transakcja } = await searchParams;
  const [complaints, purchases] = await Promise.all([listMyComplaints(user.id), getPurchases(user.id)]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Pomoc" back="/profil" subtitle="Najczęstsze pytania i zgłoszenia" />
      <Card>
        {FAQ.map((f) => (
          <details key={f.q} className="group border-b border-forest-900/5 last:border-0">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[15px] font-medium">
              {f.q}
              <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="px-4 pb-4 text-sm text-muted">{f.a}</p>
          </details>
        ))}
      </Card>
      <SectionTitle>Zgłoś problem lub reklamację</SectionTitle>
      <ComplaintForm
        defaultTransactionId={transakcja}
        transactions={purchases.slice(0, 30).map((t) => ({ id: t.id, label: `${formatDate(t.occurredAt)} · ${formatPLN(t.totalGrosze)} (${t.externalId})` }))}
      />
      {complaints.length > 0 && (
        <>
          <SectionTitle>Twoje zgłoszenia</SectionTitle>
          <Card className="divide-y divide-forest-900/5">
            {complaints.map((c) => (
              <div key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{c.subject}</p>
                  <Badge tone={c.status === "RESOLVED" ? "green" : c.status === "REJECTED" ? "red" : "amber"}>{STATUS_LABELS[c.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">Zgłoszono {formatDate(c.createdAt)}</p>
                {c.resolution && <p className="mt-2 rounded-lg bg-forest-50 p-3 text-sm">Odpowiedź: {c.resolution}</p>}
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
