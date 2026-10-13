import { apiRoute } from "@/server/http";
import { staffRolesSchema } from "@/server/services/admin-schemas";
import { updateStaff } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "roles.manage" }, body: staffRolesSchema }, async ({ user, params, body, ipHash }) => {
  await updateStaff(user!, params.id!, body, ipHash);
  return { ok: true };
});
