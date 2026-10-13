import { apiRoute, idempotencyKey } from "@/server/http";
import { adjustSchema } from "@/server/services/admin-schemas";
import { adjustPoints } from "@/server/loyalty/adjustments";

export const POST = apiRoute({ auth: { permission: "points.adjust" }, body: adjustSchema }, async ({ user, params, body, req, ipHash }) => {
  const entry = await adjustPoints({ actor: user!, cardId: params.id!, points: body.points, reason: body.reason, idempotencyKey: idempotencyKey(req), ipHash });
  return { entry };
});
