import { requireCustomerPage } from "@/server/auth/current";
import { PageHeader } from "@/components/ui/misc";
import { ChangePasswordForm } from "@/components/app/profile-forms";

export const metadata = { title: "Zmiana hasła" };

export default async function PasswordPage() {
  await requireCustomerPage();
  return (
    <div className="animate-fade-in">
      <PageHeader title="Zmiana hasła" back="/profil" subtitle="Po zmianie hasła pozostałe urządzenia zostaną wylogowane." />
      <ChangePasswordForm />
    </div>
  );
}
