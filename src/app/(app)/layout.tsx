import Link from "next/link";
import { Bell } from "lucide-react";
import { requireCustomerPage } from "@/server/auth/current";
import { unreadCount } from "@/server/services/notifications";
import { BottomNav, SideNav } from "@/components/app/app-nav";
import { Logo } from "@/components/app/logo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomerPage();
  const unread = await unreadCount(user.id);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-forest-900/5 bg-cream/90 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" aria-label="Zielony Zakątek — strona główna">
            <Logo />
          </Link>
          <Link
            href="/powiadomienia"
            className="relative flex size-11 items-center justify-center rounded-full text-forest-800 hover:bg-forest-50"
            aria-label={unread > 0 ? `Powiadomienia, ${unread} nieprzeczytane` : "Powiadomienia"}
          >
            <Bell className="size-[22px]" aria-hidden="true" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full bg-clay-500 px-1 text-[11px] font-bold text-white ring-2 ring-cream">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl gap-8 px-4 lg:pt-6">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20">
            <SideNav />
          </div>
        </aside>
        <main id="tresc" className="mx-auto w-full max-w-xl flex-1 pb-28 pt-4 lg:max-w-2xl lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
