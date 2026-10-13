import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata = { title: "Odzyskiwanie dostępu" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Nie pamiętasz hasła?"
      subtitle="Podaj adres e-mail konta. Wyślemy link do ustawienia nowego hasła."
      footer={
        <Link href="/logowanie" className="font-semibold text-forest-700 underline underline-offset-2">
          Wróć do logowania
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
