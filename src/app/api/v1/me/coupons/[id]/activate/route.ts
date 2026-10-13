import { apiRoute } from "@/server/http";
import { setCouponActivation } from "@/server/loyalty/coupons";

/** POST = aktywuj kupon (kasa zastosuje go automatycznie), DELETE = dezaktywuj. */
export const POST = apiRoute({ auth: "customer" }, async ({ user, params }) => ({ coupon: await setCouponActivation(user!.id, params.id!, true) }));
export const DELETE = apiRoute({ auth: "customer" }, async ({ user, params }) => ({ coupon: await setCouponActivation(user!.id, params.id!, false) }));
