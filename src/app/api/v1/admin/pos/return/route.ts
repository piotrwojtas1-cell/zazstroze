import { apiRoute, readJson } from "@/server/http";
import { saleReturn } from "@/server/pos/service";
import { adapter, auditPos, internalIntegrationId, posAuth } from "../_shared";

export const POST = apiRoute({ auth: posAuth }, async ({ req, user, ipHash }) => {
  const result = await saleReturn(await internalIntegrationId(), adapter.parseReturn(await readJson(req)));
  if (!result.duplicate) await auditPos(user!, "pos.return", result.transactionId, result, ipHash);
  return result;
});
