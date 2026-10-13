import { apiRoute } from "@/server/http";
import { cancelCouponSchema } from "@/server/services/admin-schemas";
import { cancelCoupon } from "@/server/loyalty/coupons";
import { AppError } from "@/server/errors";

export const POST = apiRoute({ auth: { permission: "coupons.manage" }, body: cancelCouponSchema }, async ({ user, params, body, ipHash }) => {
  // Zwrot punktów zmienia saldo — wymaga dodatkowo uprawnienia do korekt.
  if (body.refundPoints && !user!.permissions.has("points.adjust")) throw new AppError("FORBIDDEN", "Zwrot punktów wymaga uprawnienia do korekt.");
  await cancelCoupon({ actor: user!, couponId: params.id!, refundPoints: body.refundPoints, reason: body.reason, ipHash });
  return { ok: true };
});
