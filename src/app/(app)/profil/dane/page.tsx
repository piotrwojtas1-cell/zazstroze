import { requireCustomerPage } from "@/server/auth/current";
import { getProfile } from "@/server/services/customer";
import { PageHeader } from "@/components/ui/misc";
import { ProfileForm } from "@/components/app/profile-forms";

export const metadata = { title: "Moje dane" };

export default async function ProfileDataPage() {
  const user = await requireCustomerPage();
  const u = await getProfile(user.id);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Moje dane" back="/profil" subtitle="Podajemy tylko to, co niezbędne. Pola opcjonalne możesz zostawić puste." />
      <ProfileForm
        email={u.email}
        initial={{
          firstName: u.profile?.firstName ?? "",
          lastName: u.profile?.lastName ?? "",
          phone: u.profile?.phone ?? "",
          postalCode: u.profile?.postalCode ?? "",
          birthMonth: u.profile?.birthMonth ?? null,
        }}
      />
    </div>
  );
}
