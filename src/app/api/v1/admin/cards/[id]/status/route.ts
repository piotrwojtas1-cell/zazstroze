import { apiRoute } from "@/server/http";
import { cardStatusSchema } from "@/server/services/admin-schemas";
import { setCardStatus } from "@/server/services/admin";

export const PUT = apiRoute({ auth: { permission: "customers.manage" }, body: cardStatusSchema }, async ({ user, params, body, ipHash }) => {
  await setCardStatus(user!, params.id!, body, ipHash);
  return { ok: true };
});
