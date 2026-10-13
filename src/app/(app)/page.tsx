import Link from "next/link";
import { ArrowRight, QrCode, Sparkles, CalendarDays, ChevronRight, Ticket } from "lucide-react";
import { requireCustomerPage } from "@/server/auth/current";
import { getHomeData } from "@/server/services/customer";
import { Card, SectionTitle, Badge, ProgressBar } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { formatNumber, plural } from "@/lib/money";
import { greeting, MONTHS, formatDate, daysUntil } from "@/lib/dates";
import { valueLabel } from "@/lib/loyalty-format";

export const metadata = { title: "Start" };

export default async function HomePage() {
  const user = await requireCustomerPage();
  const d = await getHomeData(user.id);
  const { card, progress } = d;

  return (
    <div className="animate-fade-in">
      <p className="text-sm text-muted">{greeting()},</p>
      <h1 className="text-[1.9rem] font-semibold leading-tight">{user.firstName} 🌿</h1>

      {/* Saldo i poziom */}
      <section aria-labelledby="saldo" className="leaf-pattern relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 via-forest-900 to-forest-950 p-5 text-white shadow-lift">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="saldo" className="font-sans text-sm font-medium text-forest-100/90">Twoje punkty</h2>
            <p className="mt-1 font-display text-5xl font-semibold tabular-nums" data-testid="points-balance">
              {formatNumber(card.pointsBalance)}
            </p>
          </div>
          {card.tier && (
            <span className="chip bg-white/10 text-white ring-1 ring-white/20">
              <span className="size-2 rounded-full" style={{ backgroundColor: card.tier.color }} aria-hidden />
              Poziom {card.tier.name}
            </span>
          )}
        </div>
        {card.pointsBalance < 0 && (
          <p className="mt-2 rounded-lg bg-clay-500/30 px-3 py-2 text-sm">Saldo jest ujemne po zwrocie towaru — wymiana nagród będzie możliwa po jego wyrównaniu.</p>
        )}
        {progress.next ? (
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-forest-100/90">
              <span>Do poziomu {progress.next.name}</span>
              <span>
                {formatNumber(progress.missing)} {plural(progress.missing, "punkt", "punkty", "punktów")}
              </span>
            </div>
            <ProgressBar value={progress.earned} max={progress.next.minPoints} label={`Postęp do poziomu ${progress.next.name}`} />
          </div>
        ) : (
          <p className="mt-5 text-sm text-forest-100/90">Masz najwyższy poziom członkostwa. Dziękujemy! 🌳</p>
        )}
        <ButtonLink href="/karta" variant="light" className="mt-5 w-full" size="lg">
          <QrCode className="size-5" aria-hidden /> Pokaż kartę przy kasie
        </ButtonLink>
      </section>

      {/* Najbliższa nagroda */}
      {(d.nextReward || d.affordable) && (
        <Card className="mt-4 flex items-center gap-4 p-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-2xl" aria-hidden>
            {(d.affordable ?? d.nextReward)!.imageEmoji}
          </span>
          <div className="min-w-0 flex-1">
            {d.affordable ? (
              <>
                <p className="text-sm font-semibold">Możesz odebrać: {d.affordable.name}</p>
                <p className="text-xs text-muted">Za {formatNumber(d.affordable.pointsCost)} pkt</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Najbliższa nagroda: {d.nextReward!.name}</p>
                <p className="text-xs text-muted">
                  Brakuje {formatNumber(d.nextReward!.pointsCost - card.pointsBalance)} pkt
                </p>
              </>
            )}
          </div>
          <Link href="/nagrody" className="flex size-10 items-center justify-center rounded-full bg-forest-50 text-forest-800" aria-label="Przejdź do katalogu nagród">
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </Card>
      )}

      {/* Kupony */}
      <SectionTitle action={<Link href="/kupony" className="text-sm font-medium text-forest-700">Wszystkie</Link>}>Twoje kupony</SectionTitle>
      {d.coupons.length === 0 ? (
        <Card className="flex items-center gap-3 p-4 text-sm text-muted">
          <Ticket className="size-5 text-forest-600" aria-hidden />
          Nie masz aktywnych kuponów. <Link href="/nagrody" className="font-medium text-forest-700 underline">Wymień punkty</Link>
        </Card>
      ) : (
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {d.coupons.map((c) => {
            const days = daysUntil(c.expiresAt);
            return (
              <li key={c.id} className="snap-start">
                <Link href="/kupony" className="card block w-56 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl font-semibold text-forest-800">{valueLabel(c.type, c.valueGrosze, c.percentBp)}</span>
                    {c.status === "ACTIVATED" && <Badge>Aktywny</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">{c.title}</p>
                  <p className={days <= 3 ? "mt-1 text-xs font-medium text-clay-700" : "mt-1 text-xs text-muted"}>
                    {days <= 3 ? `Wygasa za ${days} ${plural(days, "dzień", "dni", "dni")}` : `Ważny do ${formatDate(c.expiresAt)}`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Oferty sezonowe */}
      {d.offers.length > 0 && (
        <>
          <SectionTitle>Oferty sezonowe</SectionTitle>
          <ul className="space-y-3">
            {d.offers.map((o) => (
              <li key={o.id}>
                <Card className="flex gap-4 p-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-moss-100 text-2xl" aria-hidden>
                    {o.imageEmoji}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-sans text-[15px] font-semibold text-ink">{o.name}</h3>
                      {o.type === "POINTS_MULTIPLIER" && <Badge tone="moss"><Sparkles className="size-3" aria-hidden />x{(o.multiplierBp ?? 0) / 10000} pkt</Badge>}
                      {o.type === "BONUS_POINTS" && <Badge tone="moss">+{o.bonusPoints} pkt</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">{o.description}</p>
                    <p className="mt-1.5 text-xs text-muted">Do {formatDate(o.endsAt)}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Kalendarz */}
      <SectionTitle action={<Link href="/porady/kalendarz" className="text-sm font-medium text-forest-700">Kalendarz</Link>}>
        {MONTHS[d.month - 1]![0]!.toUpperCase() + MONTHS[d.month - 1]!.slice(1)} w ogrodzie
      </SectionTitle>
      <Card className="divide-y divide-forest-900/5">
        {d.tasks.map((t) => (
          <div key={t.id} className="flex gap-3 p-4">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-forest-600" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-sm text-muted">{t.description}</p>
            </div>
          </div>
        ))}
      </Card>

      {d.tip && (
        <>
          <SectionTitle>Porada na teraz</SectionTitle>
          <Link href={`/porady/${d.tip.slug}`} className="card group flex items-center gap-4 p-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-3xl" aria-hidden>{d.tip.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold group-hover:text-forest-700">{d.tip.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">{d.tip.excerpt}</p>
            </div>
            <ChevronRight className="size-5 text-muted" aria-hidden />
          </Link>
        </>
      )}

      {d.interestKeys.length === 0 && (
        <Card className="mt-6 bg-moss-100/60 p-4">
          <p className="text-sm font-semibold">Dopasuj aplikację do swojego ogrodu</p>
          <p className="mt-1 text-sm text-muted">Wybierz zainteresowania, a pokażemy trafniejsze porady i oferty.</p>
          <ButtonLink href="/profil/zainteresowania" variant="secondary" size="sm" className="mt-3">Wybierz zainteresowania</ButtonLink>
        </Card>
      )}
    </div>
  );
}
