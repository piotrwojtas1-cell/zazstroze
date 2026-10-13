import "server-only";
import type { ComplaintStatus } from "@prisma/client";
import { prisma, withTx } from "../db";
import { notFound } from "../errors";
import { audit } from "../audit";
import { enforce, RULES } from "../rate-limit";
import { notify } from "./notifications";
import type { SessionUser } from "../auth/session";

export async function createComplaint(userId: string, input: { subject: string; description: string; transactionId?: string }) {
  await enforce(RULES.complaint, userId);
  const card = await prisma.loyaltyCard.findUnique({ where: { userId } });
  let transactionId: string | undefined;
  if (input.transactionId) {
    const t = await prisma.transaction.findFirst({ where: { id: input.transactionId, card: { userId } } });
    if (!t) throw notFound("Transakcja");
    transactionId = t.id;
  }
  return prisma.complaint.create({
    data: { userId, cardId: card?.id, transactionId, subject: input.subject, description: input.description },
  });
}

export const listMyComplaints = (userId: string) =>
  prisma.complaint.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Nowe",
  IN_PROGRESS: "W trakcie",
  RESOLVED: "Rozpatrzone",
  REJECTED: "Odrzucone",
};

export async function handleComplaint(actor: SessionUser, id: string, input: { status: ComplaintStatus; resolution?: string }, ipHash: string) {
  return withTx(async (tx) => {
    const c = await tx.complaint.findUnique({ where: { id } });
    if (!c) throw notFound("Reklamacja");
    const updated = await tx.complaint.update({
      where: { id },
      data: { status: input.status, resolution: input.resolution ?? c.resolution, handledById: actor.id },
    });
    await audit(tx, {
      actorUserId: actor.id,
      actorLabel: actor.email,
      action: "complaint.update",
      entityType: "Complaint",
      entityId: id,
      before: { status: c.status },
      after: { status: input.status, resolution: input.resolution },
      ipHash,
    });
    if (input.status === "RESOLVED" || input.status === "REJECTED") {
      await notify(tx, c.userId, {
        category: "TRANSACTIONAL",
        title: `Reklamacja: ${STATUS_LABELS[input.status].toLowerCase()}`,
        body: input.resolution ? `„${c.subject}” — ${input.resolution}` : `Twoje zgłoszenie „${c.subject}” zostało rozpatrzone.`,
        link: "/pomoc",
      });
    }
    return updated;
  });
}
