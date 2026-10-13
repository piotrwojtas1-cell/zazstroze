import "server-only";
import type { NotificationCategory } from "@prisma/client";
import { prisma, type Db } from "../db";
import { notFound } from "../errors";

export interface NotifyInput {
  category: NotificationCategory;
  title: string;
  body: string;
  link?: string;
}

/** Powiadomienie w aplikacji. Komunikaty marketingowe wysyłaj wyłącznie przez `sendCampaignNotification` (sprawdza zgody). */
export function notify(db: Db, userId: string, input: NotifyInput) {
  return db.notification.create({ data: { userId, ...input } });
}

export async function listNotifications(userId: string, limit = 50) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}

export const unreadCount = (userId: string) => prisma.notification.count({ where: { userId, readAt: null } });

export async function markRead(userId: string, id: string) {
  const r = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
  if (r.count === 0) {
    const exists = await prisma.notification.count({ where: { id, userId } });
    if (!exists) throw notFound("Powiadomienie");
  }
}

export const markAllRead = (userId: string) =>
  prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
