import { z } from "zod";
import { apiRoute } from "@/server/http";
import { setIntegrationActive } from "@/server/services/admin";

export const PATCH = apiRoute({ auth: { permission: "integrations.manage" }, body: z.object({ active: z.boolean() }) }, async ({ user, params, body, ipHash }) => {
  await setIntegrationActive(user!, params.id!, body.active, ipHash);
  return { ok: true };
});
