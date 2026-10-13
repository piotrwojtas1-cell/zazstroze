import { apiRoute } from "@/server/http";
import { rolePermissionsSchema } from "@/server/services/admin-schemas";
import { setRolePermissions } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "roles.manage" }, body: rolePermissionsSchema }, async ({ user, params, body, ipHash }) => {
  await setRolePermissions(user!, params.id!, body.permissions, ipHash);
  return { ok: true };
});
