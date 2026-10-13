import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Nowe hasło" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Ustaw nowe hasło" subtitle="Po zmianie hasła wylogujemy Cię ze wszystkich urządzeń.">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Alert tone="error">
          Brak tokenu w linku. <Link href="/odzyskaj-haslo" className="underline">Poproś o nowy link.</Link>
        </Alert>
      )}
    </AuthShell>
  );
}
