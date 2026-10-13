import { requireCustomerPage } from "@/server/auth/current";
import { currentConsents, consentHistory, CONSENT_LABELS } from "@/server/services/consents";
import { prisma } from "@/server/db";
import { PageHeader, Card } from "@/components/ui/misc";
import { PrivacySettings } from "@/components/app/profile-forms";
import { formatDateTime } from "@/lib/dates";

export const metadata = { title: "Prywatność i zgody" };

export default async function PrivacySettingsPage() {
  const user = await requireCustomerPage();
  const c = await currentConsents(prisma, user.id);
  const history = await consentHistory(user.id);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Prywatność i zgody" back="/profil" subtitle="Zgody są dobrowolne i możesz je zmienić w każdej chwili." />
      <PrivacySettings initial={{ marketingEmail: c.MARKETING_EMAIL, marketingSms: c.MARKETING_SMS, marketingPush: c.MARKETING_PUSH, personalization: c.PERSONALIZATION }} />
      <details className="card mt-5 p-5">
        <summary className="cursor-pointer text-sm font-semibold">Historia zgód ({history.length})</summary>
        <ul className="mt-3 divide-y divide-forest-900/5 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex justify-between gap-3 py-2">
              <span>{CONSENT_LABELS[h.type]}: <strong className={h.granted ? "text-forest-700" : "text-muted"}>{h.granted ? "udzielona" : "brak / wycofana"}</strong></span>
              <span className="shrink-0 text-xs text-muted">{formatDateTime(h.createdAt)}</span>
            </li>
          ))}
        </ul>
      </details>
      <Card className="mt-5 p-5 text-sm text-muted">Szczegóły przetwarzania danych znajdziesz w <a href="/polityka-prywatnosci" className="font-medium text-forest-700 underline">polityce prywatności</a>.</Card>
    </div>
  );
}
