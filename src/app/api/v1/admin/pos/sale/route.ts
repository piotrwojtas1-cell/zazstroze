import { apiRoute, readJson } from "@/server/http";
import { sale } from "@/server/pos/service";
import { adapter, auditPos, internalIntegrationId, posAuth } from "../_shared";

export const POST = apiRoute({ auth: posAuth }, async ({ req, user, ipHash }) => {
  const result = await sale(await internalIntegrationId(), adapter.parseSale(await readJson(req)));
  if (!result.duplicate) await auditPos(user!, "pos.sale", result.transactionId, result, ipHash);
  return result;
});
