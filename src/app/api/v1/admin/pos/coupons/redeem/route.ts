import { apiRoute, readJson } from "@/server/http";
import { couponRedeem } from "@/server/pos/service";
import { adapter, internalIntegrationId, posAuth } from "../../_shared";

export const POST = apiRoute({ auth: posAuth }, async ({ req }) => couponRedeem(await internalIntegrationId(), adapter.parseCoupon(await readJson(req))));
