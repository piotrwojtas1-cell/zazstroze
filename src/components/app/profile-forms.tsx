"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { SelectField, Switch, TextField } from "@/components/ui/field";
import { Alert, Card } from "@/components/ui/misc";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { InterestPicker } from "./interest-picker";
import { MONTHS } from "@/lib/dates";

export function ProfileForm({ email, initial }: { email: string; initial: { firstName: string; lastName: string; phone: string; postalCode: string; birthMonth: number | null } }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api("/api/v1/me/profile", { method: "PATCH", body: form });
      toast("Zapisano zmiany.");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        toast(err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
      <TextField label="Adres e-mail" value={email} disabled hint="Zmiana adresu e-mail jest możliwa przez kontakt ze sklepem." />
      <TextField label="Imię" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} error={errors.firstName} required />
      <TextField label="Nazwisko" optional autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} error={errors.lastName} />
      <TextField label="Telefon" optional type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} />
      <TextField label="Kod pocztowy" optional autoComplete="postal-code" inputMode="numeric" placeholder="00-000" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} error={errors.postalCode} hint="Pomaga planować ofertę sklepów w okolicy." />
      <SelectField
        label="Miesiąc urodzin"
        optional
        value={form.birthMonth ?? ""}
        onChange={(e) => setForm({ ...form, birthMonth: e.target.value ? Number(e.target.value) : null })}
        hint="Tylko miesiąc — wyślemy życzenia z drobnym upominkiem."
      >
        <option value="">— nie podaję —</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </SelectField>
      <Button type="submit" loading={loading} block>Zapisz</Button>
    </form>
  );
}

export function InterestsForm({ interests, initial }: { interests: { key: string; name: string; emoji: string }[]; initial: string[] }) {
  const toast = useToast();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [loading, setLoading] = useState(false);
  return (
    <Card className="p-5">
      <InterestPicker interests={interests} value={value} onChange={setValue} />
      <Button
        className="mt-6"
        block
        loading={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await api("/api/v1/me/interests", { method: "PUT", body: { interests: value } });
            toast("Zainteresowania zapisane. Dopasujemy porady i oferty.");
            router.refresh();
          } catch (e) {
            toast(e instanceof ApiError ? e.message : "Nie udało się zapisać.", "error");
          } finally {
            setLoading(false);
          }
        }}
      >
        Zapisz zainteresowania
      </Button>
    </Card>
  );
}

type Consents = { marketingEmail: boolean; marketingSms: boolean; marketingPush: boolean; personalization: boolean };

export function PrivacySettings({ initial }: { initial: Consents }) {
  const toast = useToast();
  const router = useRouter();
  const [consents, setConsents] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function update(next: Consents) {
    const prev = consents;
    setConsents(next);
    setSaving(true);
    try {
      await api("/api/v1/me/consents", { method: "PUT", body: next });
      toast("Zapisano preferencje.");
    } catch (e) {
      setConsents(prev);
      toast(e instanceof ApiError ? e.message : "Nie udało się zapisać.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api("/api/v1/me/delete", { body: { password, confirm } });
      router.replace("/witaj");
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Nie udało się usunąć konta.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="px-5 py-2">
        <h2 className="pt-3 font-sans text-sm font-semibold uppercase tracking-wider text-muted">Zgody marketingowe</h2>
        <div className="divide-y divide-forest-900/5">
          <Switch disabled={saving} checked={consents.marketingEmail} onChange={(v) => update({ ...consents, marketingEmail: v })} label="Oferty e-mailem" description="Nowości, promocje i zaproszenia na wydarzenia." />
          <Switch disabled={saving} checked={consents.marketingSms} onChange={(v) => update({ ...consents, marketingSms: v })} label="Oferty SMS-em" />
          <Switch disabled={saving} checked={consents.marketingPush} onChange={(v) => update({ ...consents, marketingPush: v })} label="Oferty w aplikacji" description="Powiadomienia o kampaniach w centrum powiadomień." />
          <Switch disabled={saving} checked={consents.personalization} onChange={(v) => update({ ...consents, personalization: v })} label="Personalizacja ofert" description="Dopasowanie ofert na podstawie historii zakupów." />
        </div>
      </Card>
      <Alert tone="info">
        Komunikaty transakcyjne (np. naliczenie punktów, zmiana hasła, wygasanie kuponu) są częścią usługi i pojawiają się w centrum powiadomień niezależnie od zgód marketingowych.
      </Alert>
      <Card className="p-5">
        <h2 className="font-sans text-base font-semibold text-ink">Twoje dane</h2>
        <p className="mt-1 text-sm text-muted">Pobierz kopię danych przetwarzanych w programie (format JSON).</p>
        <a href="/api/v1/me/export" className="mt-3 inline-flex h-11 items-center rounded-xl bg-forest-50 px-4 text-[15px] font-semibold text-forest-800 hover:bg-forest-100" download>
          Pobierz moje dane
        </a>
      </Card>
      <Card className="border border-danger-600/15 p-5">
        <h2 className="font-sans text-base font-semibold text-danger-700">Usuń konto</h2>
        <p className="mt-1 text-sm text-muted">
          Karta zostanie zamknięta, a niewykorzystane punkty i kupony przepadną. Dane identyfikujące zostaną zanonimizowane; dane transakcyjne pozostaną bez danych osobowych w zakresie wymaganym przepisami.
        </p>
        <Button variant="danger" className="mt-3" onClick={() => setDeleteOpen(true)}>Usuń konto</Button>
      </Card>
      <Dialog
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Usunąć konto?"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Anuluj</Button>
            <Button variant="danger" onClick={deleteAccount} loading={deleting} disabled={confirm !== "USUŃ" || !password}>Usuń trwale</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p>Tej operacji nie można cofnąć.</p>
          {deleteError && <Alert tone="error">{deleteError}</Alert>}
          <TextField label="Hasło" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField label="Wpisz USUŃ, aby potwierdzić" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </Dialog>
    </div>
  );
}

export function ChangePasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setError("Nowe hasła nie są identyczne.");
    setError(null);
    setLoading(true);
    try {
      await api("/api/v1/me/password", { body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      toast("Hasło zmienione. Wylogowaliśmy pozostałe urządzenia.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nie udało się zmienić hasła.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Obecne hasło" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
      <TextField label="Nowe hasło" type="password" autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} hint="Co najmniej 10 znaków, w tym litera i cyfra." />
      <TextField label="Powtórz nowe hasło" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
      <Button type="submit" block loading={loading}>Zmień hasło</Button>
    </form>
  );
}
