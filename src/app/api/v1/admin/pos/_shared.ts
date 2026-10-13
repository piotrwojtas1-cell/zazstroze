import "server-only";
import { getInternalIntegration } from "@/server/pos/integrations";
import { demoAdapter } from "@/server/pos/demo-adapter";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import type { SessionUser } from "@/server/auth/session";

/**
 * Kasa demonstracyjna w panelu: te same operacje co API POS, ale autoryzowane sesją pracownika
 * (uprawnienie pos.operate) zamiast podpisu HMAC. Operacje zmieniające saldo trafiają do audytu.
 */
export const posAuth = { permission: "pos.operate" } as const;
export const adapter = demoAdapter;
export const internalIntegrationId = async () => (await getInternalIntegration()).id;

export function auditPos(actor: SessionUser, action: string, entityId: string, after: unknown, ipHash: string) {
  return audit(prisma, { actorUserId: actor.id, actorLabel: actor.email, action, entityType: "Transaction", entityId, after, ipHash });
}
