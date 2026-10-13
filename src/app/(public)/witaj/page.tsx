import { redirect } from "next/navigation";
import { QrCode, Gift, CalendarHeart, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/server/auth/current";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/app/logo";

export const metadata = { title: "Witaj" };

const BENEFITS = [
  { icon: QrCode, title: "Karta zawsze pod ręką", text: "Pokaż kod QR przy kasie — punkty naliczą się automatycznie." },
  { icon: Gift, title: "Nagrody za punkty", text: "Wymieniaj punkty na rabaty i produkty ogrodnicze." },
  { icon: CalendarHeart, title: "Kalendarz ogrodnika", text: "Podpowiemy, co robić w ogrodzie w każdym miesiącu." },
  { icon: Sparkles, title: "Oferty sezonowe", text: "Bonusy punktowe i promocje dopasowane do Twoich zainteresowań." },
];

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (user) redirect(user.kind === "STAFF" ? "/admin" : "/");
  return (
    <main id="tresc" className="min-h-dvh">
      <section className="leaf-pattern relative overflow-hidden bg-forest-900 px-5 pb-16 pt-6 text-white">
        <div className="mx-auto max-w-5xl">
          <Logo light />
          <div className="mt-14 max-w-xl animate-fade-in">
            <p className="chip bg-white/10 text-moss-300 ring-1 ring-white/15">Program lojalnościowy</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] text-white sm:text-5xl">Ogród, który odwdzięcza się punktami</h1>
            <p className="mt-4 text-lg text-forest-100/90">Dołącz do klubu stałych klientów Zielonego Zakątka. Rejestracja zajmuje minutę, a karta działa od razu.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/rejestracja" size="lg" variant="light">
                Załóż darmową kartę
              </ButtonLink>
              <ButtonLink href="/logowanie" size="lg" variant="ghost" className="text-white ring-1 ring-white/30 hover:bg-white/10">
                Mam już konto
              </ButtonLink>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 top-10 size-80 rounded-full bg-forest-600/40 blur-3xl" aria-hidden />
      </section>
      <section className="mx-auto max-w-5xl px-5 py-12" aria-labelledby="korzysci">
        <h2 id="korzysci" className="text-2xl font-semibold">Co zyskujesz?</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card flex gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-sans text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted">
          Szczegóły w <a className="font-medium text-forest-700 underline underline-offset-2" href="/regulamin">regulaminie programu</a> i{" "}
          <a className="font-medium text-forest-700 underline underline-offset-2" href="/polityka-prywatnosci">polityce prywatności</a>.
        </p>
      </section>
    </main>
  );
}
