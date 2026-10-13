import { apiRoute } from "@/server/http";

export const GET = apiRoute({ auth: "user" }, async ({ user }) => ({
  id: user!.id,
  email: user!.email,
  kind: user!.kind,
  firstName: user!.firstName,
  roles: user!.roles,
  permissions: [...user!.permissions],
}));
