import { apiRoute, idempotencyKey } from "@/server/http";
import { redeemReward } from "@/server/loyalty/rewards";
import { enforce, RULES } from "@/server/rate-limit";

/** Wymiana punktów na nagrodę. Wymaga nagłówka Idempotency-Key (ochrona przed podwójnym kliknięciem). */
export const POST = apiRoute({ auth: "customer" }, async ({ user, params, req }) => {
  const key = idempotencyKey(req);
  await enforce(RULES.redeem, user!.id);
  const r = await redeemReward({ userId: user!.id, rewardId: params.id!, idempotencyKey: key });
  return { coupon: r.coupon, pointsBalance: r.balance, replayed: r.replayed };
});
