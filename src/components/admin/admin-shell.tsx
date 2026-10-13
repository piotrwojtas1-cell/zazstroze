"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { LogoutButton } from "@/components/app/logout-button";
import { AdminNav } from "./admin-nav";

export function AdminShell({ children, user }: { children: React.ReactNode; user: { email: string; name: string; roles: string[]; permissions: string[] } }) {
  const [open, setOpen] = useState(false);
  const sidebar = (
    <div className="flex h-full flex-col bg-forest-950 px-3 py-4 text-white">
      <div className="px-2">
        <Logo light />
        <p className="mt-1 pl-[46px] text-[11px] uppercase tracking-[0.14em] text-forest-200/70">Panel obsługi</p>
      </div>
      <div className="mt-6 flex-1 overflow-y-auto">
        <AdminNav permissions={user.permissions} onNavigate={() => setOpen(false)} />
      </div>
      <div className="mt-4 rounded-xl bg-white/5 p-3">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="truncate text-xs text-forest-200/80">{user.email}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-moss-300">{user.roles.join(", ")}</p>
        <LogoutButton variant="ghost" className="mt-3 h-9 text-sm text-white ring-1 ring-white/15 hover:bg-white/10" />
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh bg-[#F4F3EE] lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">{sidebar}</aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-forest-950 px-4 lg:hidden">
        <Logo light />
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-white" aria-label="Otwórz menu" aria-expanded={open}>
          <Menu className="size-6" aria-hidden />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-in">
            {sidebar}
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-2 text-white" aria-label="Zamknij menu">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <main id="tresc" className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
