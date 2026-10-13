"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { InterestPicker } from "@/components/app/interest-picker";

interface Interest {
  key: string;
  name: string;
  emoji: string;
}

export function RegisterForm({ interests }: { interests: Interest[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    email: "",
    password: "",
    acceptTerms: false,
    acknowledgePrivacy: false,
    // Zgody marketingowe: oddzielne, dobrowolne, domyślnie NIEzaznaczone.
    marketingEmail: false,
    marketingSms: false,
    marketingPush: false,
    personalization: false,
    interests: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    setLoading(true);
    try {
      await api("/api/v1/auth/register", { body: form });
      router.replace("/karta?witaj=1");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setError(err.message);
      } else setError("Nie udało się utworzyć konta.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Imię" name="firstName" autoComplete="given-name" required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} error={errors.firstName} />
      <TextField label="Adres e-mail" type="email" name="email" autoComplete="email" inputMode="email" required value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
      <TextField
        label="Hasło"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        value={form.password}
        onChange={(e) => set("password", e.target.value)}
        error={errors.password}
        hint="Co najmniej 10 znaków, w tym litera i cyfra."
      />

      <fieldset>
        <legend className="label">
          Co Cię interesuje? <span className="font-normal text-muted">(opcjonalnie)</span>
        </legend>
        <p className="mb-3 mt-0.5 text-xs text-muted">Dopasujemy porady i kalendarz prac. Możesz to zmienić w każdej chwili.</p>
        <InterestPicker interests={interests} value={form.interests} onChange={(v) => set("interests", v)} />
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-forest-900/10">
        <legend className="sr-only">Zgody wymagane</legend>
        <Checkbox
          checked={form.acceptTerms}
          onChange={(e) => set("acceptTerms", e.target.checked)}
          label={
            <>
              Akceptuję <a href="/regulamin" target="_blank" className="text-forest-700 underline">regulamin programu</a> <span className="text-danger-600">*</span>
            </>
          }
        />
        {errors.acceptTerms && <p className="text-sm text-danger-600">{errors.acceptTerms}</p>}
        <Checkbox
          checked={form.acknowledgePrivacy}
          onChange={(e) => set("acknowledgePrivacy", e.target.checked)}
          label={
            <>
              Zapoznałem(-am) się z <a href="/polityka-prywatnosci" target="_blank" className="text-forest-700 underline">polityką prywatności</a> <span className="text-danger-600">*</span>
            </>
          }
        />
        {errors.acknowledgePrivacy && <p className="text-sm text-danger-600">{errors.acknowledgePrivacy}</p>}
      </fieldset>

      <fieldset className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-forest-900/10">
        <legend className="px-1 text-sm font-semibold text-ink">Zgody dobrowolne</legend>
        <p className="text-xs text-muted">Nie są wymagane do korzystania z karty. Możesz je wycofać w dowolnym momencie w ustawieniach prywatności.</p>
        <Checkbox checked={form.marketingEmail} onChange={(e) => set("marketingEmail", e.target.checked)} label="Chcę otrzymywać oferty i nowości e-mailem" />
        <Checkbox checked={form.marketingSms} onChange={(e) => set("marketingSms", e.target.checked)} label="Chcę otrzymywać oferty SMS-em" />
        <Checkbox checked={form.marketingPush} onChange={(e) => set("marketingPush", e.target.checked)} label="Chcę otrzymywać oferty w aplikacji" />
        <Checkbox
          checked={form.personalization}
          onChange={(e) => set("personalization", e.target.checked)}
          label="Zgadzam się na personalizację ofert"
          description="Na podstawie historii zakupów i wybranych zainteresowań."
        />
      </fieldset>

      <Button type="submit" block size="lg" loading={loading}>
        Załóż kartę
      </Button>
    </form>
  );
}
