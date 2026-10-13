"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function ComplaintForm({ transactions, defaultTransactionId }: { transactions: { id: string; label: string }[]; defaultTransactionId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ subject: "", description: "", transactionId: defaultTransactionId ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api("/api/v1/me/complaints", { body: { ...form, transactionId: form.transactionId || undefined } });
      toast("Zgłoszenie wysłane. Odpowiemy w ciągu 14 dni.");
      setForm({ subject: "", description: "", transactionId: "" });
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
      <TextField label="Temat" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} error={errors.subject} maxLength={120} placeholder="Np. brak punktów za zakupy" />
      <SelectField label="Dotyczy transakcji" optional value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })}>
        <option value="">— wybierz —</option>
        {transactions.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </SelectField>
      <TextAreaField label="Opis" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={errors.description} maxLength={2000} hint="Podaj datę, godzinę i numer paragonu, jeśli to możliwe." />
      <Button type="submit" loading={loading} block>Wyślij zgłoszenie</Button>
    </form>
  );
}
