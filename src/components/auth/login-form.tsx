"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";

export function LoginForm({ next, demo }: { next?: string; demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ redirectTo: string }>("/api/v1/auth/login", { body: { email, password } });
      const target = next && (r.redirectTo === "/admin" ? next.startsWith("/admin") : !next.startsWith("/admin")) ? next : r.redirectTo;
      router.replace(target);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nie udało się zalogować.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Adres e-mail" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField label="Hasło" type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex justify-end">
        <Link href="/odzyskaj-haslo" className="text-sm font-medium text-forest-700 underline-offset-2 hover:underline">
          Nie pamiętasz hasła?
        </Link>
      </div>
      <Button type="submit" block size="lg" loading={loading}>
        Zaloguj się
      </Button>
      {demo && (
        <div className="rounded-xl border border-dashed border-clay-300 bg-clay-50 p-4 text-sm text-clay-700">
          <p className="font-semibold">Tryb demonstracyjny</p>
          <ul className="mt-1.5 space-y-1">
            <li>Klient: <code>anna.demo@example.com</code> / <code>Ogrodnik2026</code></li>
            <li>Administrator: <code>admin@zielonyzakatek.example</code> / <code>AdminDemo2026</code></li>
            <li>Kierownik: <code>kierownik@zielonyzakatek.example</code> / <code>KierownikDemo2026</code></li>
            <li>Obsługa: <code>obsluga@zielonyzakatek.example</code> / <code>ObslugaDemo2026</code></li>
          </ul>
        </div>
      )}
    </form>
  );
}
