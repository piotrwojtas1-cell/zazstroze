import { requireStaffPage } from "@/server/auth/current";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Panel", template: "%s · Panel · Zielony Zakątek" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return (
    <AdminShell user={{ email: user.email, name: user.firstName, roles: user.roles, permissions: [...user.permissions] }}>
      {children}
    </AdminShell>
  );
}
