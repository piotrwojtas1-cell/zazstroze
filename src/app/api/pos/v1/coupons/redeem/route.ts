import { posRoute } from "@/server/pos/http";
import { couponRedeem } from "@/server/pos/service";

export const POST = posRoute("coupons.redeem", ({ integration, adapter, body }) => couponRedeem(integration.id, adapter.parseCoupon(body)));
