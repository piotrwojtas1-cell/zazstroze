import { posRoute } from "@/server/pos/http";
import { couponValidate } from "@/server/pos/service";

export const POST = posRoute("coupons.validate", ({ adapter, body }) => couponValidate(adapter.parseCoupon(body)));
