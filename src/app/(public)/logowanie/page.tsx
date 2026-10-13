import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current";
import { isDemoMode } from "@/server/env";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Logowanie" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.kind === "STAFF" ? "/admin" : "/");
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <AuthShell
      title="Witaj ponownie"
      subtitle="Zaloguj się, aby zobaczyć kartę i punkty."
      footer={
        <>
          Nie masz konta?{" "}
          <Link href="/rejestracja" className="font-semibold text-forest-700 underline underline-offset-2">
            Zarejestruj się
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext} demo={isDemoMode()} />
    </AuthShell>
  );
}
