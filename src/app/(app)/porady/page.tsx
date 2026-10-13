import Link from "next/link";
import { CalendarDays, ChevronRight, Search } from "lucide-react";
import { requireCustomerPage } from "@/server/auth/current";
import { listArticles, listInterests } from "@/server/services/content";
import { prisma } from "@/server/db";
import { PageHeader, EmptyState, Card } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { currentMonth, MONTHS } from "@/lib/dates";

export const metadata = { title: "Porady" };

export default async function TipsPage({ searchParams }: { searchParams: Promise<{ temat?: string; q?: string }> }) {
  const user = await requireCustomerPage();
  const { temat, q } = await searchParams;
  const [interests, mine] = await Promise.all([listInterests(), prisma.userInterest.findMany({ where: { userId: user.id } })]);
  const query = q?.slice(0, 80);
  const articles = await listArticles({ interest: temat, q: query });
  const myKeys = new Set(mine.map((m) => m.interestKey));
  const month = currentMonth();
  const sorted = [...articles].sort((a, b) => rank(b) - rank(a));
  function rank(a: (typeof articles)[number]) {
    return (a.months.includes(month) ? 2 : 0) + (a.interestKeys.some((k) => myKeys.has(k)) ? 1 : 0);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Porady ogrodnicze" subtitle="Sezonowe wskazówki od naszych ogrodników" />
      <Link href="/porady/kalendarz" className="card mb-5 flex items-center gap-4 bg-moss-100/60 p-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-forest-700"><CalendarDays className="size-6" aria-hidden /></span>
        <div className="flex-1">
          <p className="font-semibold">Kalendarz prac ogrodniczych</p>
          <p className="text-sm text-muted">Co zrobić w ogrodzie w {MONTHS[month - 1] === "luty" ? "lutym" : "tym miesiącu"}?</p>
        </div>
        <ChevronRight className="size-5 text-muted" aria-hidden />
      </Link>

      <form role="search" className="relative mb-4" action="/porady">
        {temat && <input type="hidden" name="temat" value={temat} />}
        <label htmlFor="q" className="sr-only">Szukaj porad</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input id="q" name="q" defaultValue={query} placeholder="Szukaj, np. tulipany, trawnik…" className="input pl-11" />
      </form>

      <nav aria-label="Tematy" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href="/porady" aria-current={!temat ? "page" : undefined} className={cn("chip shrink-0 px-3.5 py-2 text-sm ring-1", !temat ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}>
          Wszystkie
        </Link>
        {interests.map((i) => (
          <Link
            key={i.key}
            href={`/porady?temat=${i.key}`}
            aria-current={temat === i.key ? "page" : undefined}
            className={cn("chip shrink-0 px-3.5 py-2 text-sm ring-1", temat === i.key ? "bg-forest-700 text-white ring-forest-700" : "bg-white ring-forest-900/10")}
          >
            <span aria-hidden>{i.emoji}</span> {i.name}
          </Link>
        ))}
      </nav>

      {sorted.length === 0 ? (
        <EmptyState icon="🔍" title="Nic nie znaleźliśmy" description="Spróbuj innego hasła lub tematu." />
      ) : (
        <ul className="space-y-3">
          {sorted.map((a) => (
            <li key={a.id}>
              <Link href={`/porady/${a.slug}`} className="card group flex gap-4 p-4">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-3xl" aria-hidden>{a.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-forest-600">
                    {a.category} · {a.readMinutes} min
                    {a.months.includes(month) && <span className="ml-2 rounded-full bg-clay-50 px-2 py-0.5 normal-case tracking-normal text-clay-700">Na teraz</span>}
                  </p>
                  <h2 className="mt-1 font-sans text-[15px] font-semibold text-ink group-hover:text-forest-700">{a.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {myKeys.size === 0 && (
        <Card className="mt-6 p-4 text-sm text-muted">
          Wybierz <Link href="/profil/zainteresowania" className="font-medium text-forest-700 underline">swoje zainteresowania</Link>, aby zobaczyć najpierw porady dla siebie.
        </Card>
      )}
    </div>
  );
}
