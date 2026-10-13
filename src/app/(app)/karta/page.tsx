import Link from "next/link";
import { requireCustomerPage } from "@/server/auth/current";
import { getCardForUser } from "@/server/services/customer";
import { createCardQrPayload } from "@/server/pos/card-qr";
import { qrSvg } from "@/server/pos/qr-image";
import { prisma } from "@/server/db";
import { expireCoupons, USABLE_STATUSES } from "@/server/loyalty/coupons";
import { LoyaltyCardView } from "@/components/app/loyalty-card";
import { Alert, Card, SectionTitle } from "@/components/ui/misc";
import { formatCardNumber } from "@/lib/luhn";
import { valueLabel } from "@/lib/loyalty-format";

export const metadata = { title: "Moja karta" };

export default async function CardPage({ searchParams }: { searchParams: Promise<{ witaj?: string }> }) {
  const user = await requireCustomerPage();
  const { witaj } = await searchParams;
  const card = await getCardForUser(user.id);
  const qr = createCardQrPayload(card.number);
  const svg = await qrSvg(qr.payload);
  await expireCoupons(prisma);
  const activated = await prisma.coupon.findMany({ where: { cardId: card.id, status: { in: USABLE_STATUSES } }, orderBy: { expiresAt: "asc" } });

  return (
    <div className="animate-fade-in">
      {witaj && (
        <div className="mb-4">
          <Alert tone="success" title={`Witaj w programie, ${user.firstName}!`}>
            Twoja karta jest aktywna. Pokaż ten kod przy kasie, aby zbierać punkty.
          </Alert>
        </div>
      )}
      <h1 className="sr-only">Moja karta</h1>
      <LoyaltyCardView
        firstName={user.firstName}
        cardNumber={card.number}
        cardNumberFormatted={formatCardNumber(card.number)}
        tierName={card.tier?.name ?? null}
        tierColor={card.tier?.color ?? "#6B8F4E"}
        pointsBalance={card.pointsBalance}
        status={card.status}
        initialQr={{ svg, payload: qr.payload, expiresInSec: qr.expiresInSec }}
      />

      <SectionTitle>Kupony do wykorzystania</SectionTitle>
      {activated.length === 0 ? (
        <Card className="p-4 text-sm text-muted">
          Brak kuponów. <Link href="/nagrody" className="font-medium text-forest-700 underline">Wymień punkty na nagrodę</Link>
        </Card>
      ) : (
        <Card className="divide-y divide-forest-900/5">
          {activated.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.title}</p>
                <p className="font-mono text-xs text-muted">{c.code}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-semibold text-forest-800">{valueLabel(c.type, c.valueGrosze, c.percentBp)}</p>
                <p className="text-xs text-muted">{c.status === "ACTIVATED" ? "Zastosuje się automatycznie" : "Podaj kod kasjerowi"}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
      <p className="mt-4 text-center text-xs text-muted">
        Kod QR zmienia się co 30 sekund — zrzut ekranu szybko traci ważność. Bez internetu podaj kasjerowi numer karty.
      </p>
    </div>
  );
}
