import { apiRoute } from "@/server/http";
import { listRoles } from "@/server/services/admin";
import { PERMISSIONS } from "@/server/auth/permissions";

export const GET = apiRoute({ auth: { permission: "roles.manage" } }, async () => ({ roles: await listRoles(), permissions: PERMISSIONS }));
