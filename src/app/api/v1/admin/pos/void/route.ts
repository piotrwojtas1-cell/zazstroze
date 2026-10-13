import { apiRoute, readJson } from "@/server/http";
import { saleVoid } from "@/server/pos/service";
import { adapter, auditPos, internalIntegrationId, posAuth } from "../_shared";

export const POST = apiRoute({ auth: posAuth }, async ({ req, user, ipHash }) => {
  const input = adapter.parseVoid(await readJson(req));
  const result = await saleVoid(await internalIntegrationId(), input, user!.id);
  if (!result.duplicate) await auditPos(user!, "pos.void", input.externalId, { ...result, reason: input.reason }, ipHash);
  return result;
});
