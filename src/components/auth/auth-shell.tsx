import Link from "next/link";
import { Logo } from "@/components/app/logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="leaf-pattern relative hidden flex-1 flex-col justify-between overflow-hidden bg-forest-900 p-12 text-white lg:flex">
        <Link href="/witaj" aria-label="Zielony Zakątek">
          <Logo light />
        </Link>
        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight">Twój ogród rośnie. Twoje punkty też.</p>
          <p className="mt-4 text-forest-100/90">Zbieraj punkty za zakupy, wymieniaj je na nagrody i korzystaj z porad dopasowanych do pory roku.</p>
        </div>
        <p className="text-sm text-forest-200/80">© {new Date().getFullYear()} Zielony Zakątek</p>
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-forest-700/40 blur-3xl" aria-hidden />
      </div>
      <main id="tresc" className="flex flex-1 flex-col px-5 pb-10 pt-6 lg:items-center lg:justify-center">
        <Link href="/witaj" className="mb-8 lg:hidden" aria-label="Zielony Zakątek">
          <Logo />
        </Link>
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
