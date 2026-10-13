import { z } from "zod";
import { apiRoute } from "@/server/http";
import { couponRelease } from "@/server/pos/service";
import { internalIntegrationId, posAuth } from "../../_shared";

const schema = z.object({ couponCode: z.string().trim().min(4).max(32), externalTransactionId: z.string().trim().min(1).max(64), reason: z.string().max(300).optional() });

export const POST = apiRoute({ auth: posAuth, body: schema }, async ({ body }) =>
  couponRelease(await internalIntegrationId(), { code: body.couponCode, externalTransactionId: body.externalTransactionId, reason: body.reason }),
);
