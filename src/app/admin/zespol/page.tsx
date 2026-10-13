import { requireStaffPage } from "@/server/auth/current";
import { listRoles, listStaff } from "@/server/services/admin";
import { PERMISSIONS } from "@/server/auth/permissions";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { StaffManager, RoleMatrix } from "@/components/admin/team";

export const metadata = { title: "Zespół i role" };

export default async function TeamPage() {
  const me = await requireStaffPage("roles.manage");
  const [staff, roles] = await Promise.all([listStaff(), listRoles()]);
  return (
    <>
      <AdminHeader title="Zespół i role" description="Zasada minimalnych uprawnień — uprawnienia są weryfikowane po stronie serwera przy każdym żądaniu." />
      <Panel title="Pracownicy">
        <StaffManager
          meId={me.id}
          roles={roles.map((r) => ({ key: r.key, name: r.name }))}
          staff={staff.map((s) => ({ id: s.id, email: s.email, name: [s.profile?.firstName, s.profile?.lastName].filter(Boolean).join(" "), active: s.status === "ACTIVE", roleKeys: s.roles.map((r) => r.role.key), lastLoginAt: s.lastLoginAt?.toISOString() ?? null }))}
        />
      </Panel>
      <Panel title="Macierz uprawnień" className="mt-6">
        <RoleMatrix
          permissions={Object.entries(PERMISSIONS).map(([key, label]) => ({ key, label }))}
          roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, description: r.description ?? "", permissions: r.permissions.map((p) => p.permissionKey), users: r._count.users }))}
        />
      </Panel>
    </>
  );
}
