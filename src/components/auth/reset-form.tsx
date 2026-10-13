"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";

export function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("Hasła nie są identyczne.");
    setError(null);
    setLoading(true);
    try {
      await api("/api/v1/auth/reset-password", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Hasło zmienione">Możesz zalogować się nowym hasłem.</Alert>
        <ButtonLink href="/logowanie" block size="lg">Przejdź do logowania</ButtonLink>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <Alert tone="error">
          {error} {error.includes("wygasł") && <Link href="/odzyskaj-haslo" className="underline">Wyślij nowy link</Link>}
        </Alert>
      )}
      <TextField label="Nowe hasło" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} hint="Co najmniej 10 znaków, w tym litera i cyfra." />
      <TextField label="Powtórz hasło" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Button type="submit" block size="lg" loading={loading}>Zapisz nowe hasło</Button>
    </form>
  );
}
