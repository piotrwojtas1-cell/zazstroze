import Link from "next/link";
import { requireStaffPage } from "@/server/auth/current";
import { listProducts } from "@/server/services/shopping";
import { getInternalIntegration } from "@/server/pos/integrations";
import { prisma } from "@/server/db";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { DemoPos } from "@/components/admin/demo-pos";
import { Alert } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { formatPLN } from "@/lib/money";

export const metadata = { title: "Kasa demonstracyjna" };

export default async function DemoPosPage() {
  await requireStaffPage("pos.operate");
  const products = await listProducts();
  const internal = await getInternalIntegration();
  const recent = await prisma.transaction.findMany({ where: { integrationId: internal.id }, orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <>
      <AdminHeader title="Kasa demonstracyjna" description="Symulacja przepływu kasowego: identyfikacja karty → koszyk → kupon → naliczenie punktów." />
      <div className="mb-5">
        <Alert tone="warning">
          To demonstracyjny terminal, a nie integracja z prawdziwym systemem POS. Używa tych samych reguł serwerowych co API POS (<code>/api/pos/v1</code>), ale autoryzuje się sesją pracownika zamiast podpisu HMAC.
        </Alert>
      </div>
      <DemoPos products={products.map((p) => ({ sku: p.sku, name: p.name, category: p.category, priceGrosze: p.priceGrosze, emoji: p.emoji }))} />
      {recent.length > 0 && (
        <Panel title="Ostatnie paragony z kasy demo" className="mt-6">
          <ul className="divide-y divide-forest-900/5 text-sm">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/admin/transakcje/${t.id}`} className="font-mono text-forest-700 hover:underline">{t.externalId}</Link>
                <span className="text-muted">{formatDateTime(t.occurredAt)}</span>
                <span>{t.type === "RETURN" ? "Zwrot" : t.status === "VOIDED" ? "Anulowana" : "Sprzedaż"}</span>
                <span className="tabular-nums">{formatPLN(t.totalGrosze)}</span>
                <span className="tabular-nums">{t.pointsAwarded} pkt</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Zwrot lub anulowanie wykonasz w szczegółach paragonu.</p>
        </Panel>
      )}
    </>
  );
}
