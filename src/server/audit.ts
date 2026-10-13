import "server-only";
import type { Prisma } from "@prisma/client";
import type { Db } from "./db";

export interface AuditInput {
  actorUserId?: string | null;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  ipHash?: string | null;
}

const toJson = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue));

/** Zapis do niezmiennego dziennika audytowego. Wywołuj w tej samej transakcji co zmiana. */
export function audit(db: Db, input: AuditInput) {
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorLabel: input.actorLabel,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      reason: input.reason ?? null,
      before: toJson(input.before),
      after: toJson(input.after),
      ipHash: input.ipHash ?? null,
    },
  });
}
