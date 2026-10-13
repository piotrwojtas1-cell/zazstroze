import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Logo } from "./logo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-forest-900/5 bg-cream">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link href="/" className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-forest-50" aria-label="Wróć do aplikacji">
            <ChevronLeft className="size-6 text-forest-800" aria-hidden />
          </Link>
          <Logo />
        </div>
      </header>
      <main id="tresc" className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Wersja z dnia {updated}</p>
        <div className="mt-4 rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-700 ring-1 ring-warning-700/20">
          Dokument przykładowy przygotowany na potrzeby wdrożenia. Przed publikacją wymaga weryfikacji przez prawnika i uzupełnienia danych administratora.
        </div>
        <article className="prose-legal mt-6 space-y-4 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </article>
      </main>
    </div>
  );
}
