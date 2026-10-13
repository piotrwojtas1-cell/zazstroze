import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current";
import { listInterests } from "@/server/services/content";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Rejestracja" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.kind === "STAFF" ? "/admin" : "/");
  const interests = await listInterests();
  return (
    <AuthShell
      title="Załóż kartę"
      subtitle="Darmowa karta stałego klienta — gotowa od razu po rejestracji."
      footer={
        <>
          Masz już konto?{" "}
          <Link href="/logowanie" className="font-semibold text-forest-700 underline underline-offset-2">
            Zaloguj się
          </Link>
        </>
      }
    >
      <RegisterForm interests={interests.map((i) => ({ key: i.key, name: i.name, emoji: i.emoji }))} />
    </AuthShell>
  );
}
