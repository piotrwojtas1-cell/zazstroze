"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/v1/auth/forgot-password", { body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Alert tone="success" title="Sprawdź skrzynkę">
        Jeśli konto o adresie <strong>{email}</strong> istnieje, wysłaliśmy wiadomość z linkiem do zmiany hasła. Link jest ważny 30 minut.
      </Alert>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Adres e-mail" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" block size="lg" loading={loading}>
        Wyślij link
      </Button>
    </form>
  );
}
