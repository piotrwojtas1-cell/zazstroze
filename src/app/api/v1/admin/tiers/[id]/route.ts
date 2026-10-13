import { apiRoute } from "@/server/http";
import { tierSchema } from "@/server/services/admin-schemas";
import { updateTier } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "config.manage" }, body: tierSchema }, async ({ user, params, body, ipHash }) => ({
  tier: await updateTier(user!, params.id!, body, ipHash),
}));
