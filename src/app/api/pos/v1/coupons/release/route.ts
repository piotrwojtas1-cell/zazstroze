import { z } from "zod";
import { posRoute } from "@/server/pos/http";
import { couponRelease } from "@/server/pos/service";

const schema = z.object({ couponCode: z.string().trim().min(4).max(32), externalTransactionId: z.string().trim().min(1).max(64), reason: z.string().max(300).optional() });

export const POST = posRoute("coupons.release", ({ integration, body }) => {
  const b = schema.parse(body);
  return couponRelease(integration.id, { code: b.couponCode, externalTransactionId: b.externalTransactionId, reason: b.reason });
});
