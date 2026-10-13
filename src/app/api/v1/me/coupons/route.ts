import { apiRoute } from "@/server/http";
import { listCustomerCoupons } from "@/server/loyalty/coupons";

export const GET = apiRoute({ auth: "customer" }, async ({ user }) => listCustomerCoupons(user!.id));
