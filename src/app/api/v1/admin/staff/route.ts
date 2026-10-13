import { apiRoute } from "@/server/http";
import { staffCreateSchema } from "@/server/services/admin-schemas";
import { createStaff, listStaff } from "@/server/services/admin";

export const GET = apiRoute({ auth: { permission: "roles.manage" } }, async () => ({
  staff: (await listStaff()).map(({ passwordHash: _p, ...u }) => u),
}));
export const POST = apiRoute({ auth: { permission: "roles.manage" }, body: staffCreateSchema }, async ({ user, body, ipHash }) => {
  const u = await createStaff(user!, body, ipHash);
  return { id: u.id, email: u.email };
});
