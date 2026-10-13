import "server-only";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma, withTx, isUniqueViolation } from "../db";
import { AppError, notFound, forbidden } from "../errors";
import { audit } from "../audit";
import { hashPassword } from "../auth/password";
import type { SessionUser } from "../auth/session";
import { PERMISSIONS } from "../auth/permissions";
import { getActiveConfig } from "../loyalty/config";
import { createIntegration } from "../pos/integrations";
import { currentConsents } from "./consents";
import { notify } from "./notifications";
import { normalizeCardNumber } from "@/lib/luhn";
import type {
  articleSchema, campaignSchema, cardStatusSchema, configSchema, gardenTaskSchema, rewardSchema, staffCreateSchema, staffRolesSchema, tierSchema,
} from "./admin-schemas";

type Actor = SessionUser;
const actorFields = (a: Actor, ipHash?: string) => ({ actorUserId: a.id, actorLabel: a.email, ipHash });

// ───────── Klienci ─────────

export async function searchCustomers(q: string | undefined, take = 30) {
  const term = q?.trim();
  const digits = term ? normalizeCardNumber(term) : "";
  return prisma.user.findMany({
    where: {
      kind: "CUSTOMER",
      ...(term
        ? {
            OR: [
              { email: { contains: term, mode: "insensitive" } },
              { profile: { firstName: { contains: term, mode: "insensitive" } } },
              { profile: { lastName: { contains: term, mode: "insensitive" } } },
              { profile: { phone: { contains: term } } },
              ...(/^\d{4,16}$/.test(digits) ? [{ card: { number: { contains: digits } } }] : []),
            ],
          }
        : {}),
    },
    include: { profile: true, card: { include: { tier: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getCustomerDetail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, kind: "CUSTOMER" },
    include: {
      profile: true,
      interests: { include: { interest: true } },
      dataRequests: { orderBy: { createdAt: "desc" } },
      complaints: { orderBy: { createdAt: "desc" }, take: 10 },
      card: {
        include: {
          tier: true,
          ledger: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { email: true } } } },
          coupons: { orderBy: { createdAt: "desc" }, take: 50 },
          transactions: { orderBy: { occurredAt: "desc" }, take: 30 },
        },
      },
    },
  });
  if (!user) throw notFound("Klient");
  const consents = await currentConsents(prisma, userId);
  return { user, consents };
}

export async function setCardStatus(actor: Actor, cardId: string, input: z.infer<typeof cardStatusSchema>, ipHash: string) {
  return withTx(async (tx) => {
    const card = await tx.loyaltyCard.findUnique({ where: { id: cardId } });
    if (!card) throw notFound("Karta");
    if (card.status === "CLOSED") throw new AppError("CONFLICT", "Karta jest zamknięta (konto usunięte).");
    await tx.loyaltyCard.update({ where: { id: cardId }, data: { status: input.status } });
    await audit(tx, {
      ...actorFields(actor, ipHash),
      action: "card.status",
      entityType: "LoyaltyCard",
      entityId: cardId,
      reason: input.reason,
      before: { status: card.status },
      after: { status: input.status },
    });
    await notify(tx, card.userId, {
      category: "SYSTEM",
      title: input.status === "BLOCKED" ? "Karta została zablokowana" : "Karta jest ponownie aktywna",
      body: input.status === "BLOCKED" ? "W razie pytań skontaktuj się ze sklepem." : "Możesz znów zbierać i wymieniać punkty.",
    });
  });
}

// ───────── Nagrody ─────────

export const listRewardsAdmin = () =>
  prisma.reward.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }], include: { requiredTier: true, _count: { select: { coupons: true } } } });

export async function saveReward(actor: Actor, id: string | null, input: z.infer<typeof rewardSchema>, ipHash: string) {
  const data = {
    ...input,
    valueGrosze: input.type === "PERCENT_OFF" ? null : (input.valueGrosze ?? null),
    percentBp: input.type === "PERCENT_OFF" ? (input.percentBp ?? null) : null,
    maxDiscountGrosze: input.type === "PERCENT_OFF" ? (input.maxDiscountGrosze ?? null) : null,
    requiredTierId: input.requiredTierId || null,
  };
  return withTx(async (tx) => {
    const before = id ? await tx.reward.findUnique({ where: { id } }) : null;
    if (id && !before) throw notFound("Nagroda");
    const reward = id ? await tx.reward.update({ where: { id }, data }) : await tx.reward.create({ data });
    await audit(tx, { ...actorFields(actor, ipHash), action: id ? "reward.update" : "reward.create", entityType: "Reward", entityId: reward.id, before, after: reward });
    return reward;
  });
}

// ───────── Kampanie ─────────

export const listCampaignsAdmin = () => prisma.campaign.findMany({ orderBy: [{ active: "desc" }, { startsAt: "desc" }] });

export async function saveCampaign(actor: Actor, id: string | null, input: z.infer<typeof campaignSchema>, ipHash: string) {
  const data = {
    ...input,
    multiplierBp: input.type === "POINTS_MULTIPLIER" ? (input.multiplierBp ?? null) : null,
    bonusPoints: input.type === "BONUS_POINTS" ? (input.bonusPoints ?? null) : null,
  };
  return withTx(async (tx) => {
    const before = id ? await tx.campaign.findUnique({ where: { id } }) : null;
    if (id && !before) throw notFound("Kampania");
    const campaign = id ? await tx.campaign.update({ where: { id }, data }) : await tx.campaign.create({ data });
    await audit(tx, { ...actorFields(actor, ipHash), action: id ? "campaign.update" : "campaign.create", entityType: "Campaign", entityId: campaign.id, before, after: campaign });
    return campaign;
  });
}

/**
 * Powiadomienie marketingowe o kampanii — WYŁĄCZNIE do klientów z aktywną zgodą MARKETING_PUSH.
 * Gdy kampania ma zainteresowania, a klient udzielił zgody na personalizację — wysyłka tylko do pasujących.
 */
export async function sendCampaignNotification(actor: Actor, campaignId: string, ipHash: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw notFound("Kampania");
  const latest = await prisma.$queryRaw<{ userId: string; type: string; granted: boolean }[]>`
    SELECT DISTINCT ON ("userId", "type") "userId", "type"::text AS "type", "granted"
    FROM "ConsentRecord" WHERE "type" IN ('MARKETING_PUSH', 'PERSONALIZATION')
    ORDER BY "userId", "type", "createdAt" DESC`;
  const push = new Set(latest.filter((r) => r.type === "MARKETING_PUSH" && r.granted).map((r) => r.userId));
  const personalization = new Set(latest.filter((r) => r.type === "PERSONALIZATION" && r.granted).map((r) => r.userId));
  const active = await prisma.user.findMany({
    where: { id: { in: [...push] }, status: "ACTIVE", kind: "CUSTOMER" },
    select: { id: true, interests: { select: { interestKey: true } } },
  });
  const recipients = active.filter((u) => {
    if (campaign.interestKeys.length === 0 || !personalization.has(u.id)) return true;
    return u.interests.some((i) => campaign.interestKeys.includes(i.interestKey));
  });
  await withTx(async (tx) => {
    if (recipients.length) {
      await tx.notification.createMany({
        data: recipients.map((r) => ({
          userId: r.id,
          category: "MARKETING" as const,
          title: `${campaign.imageEmoji} ${campaign.name}`,
          body: campaign.description,
          link: "/",
        })),
      });
    }
    await audit(tx, { ...actorFields(actor, ipHash), action: "campaign.notify", entityType: "Campaign", entityId: campaignId, after: { recipients: recipients.length } });
  });
  return { recipients: recipients.length };
}

// ───────── Treści ─────────

export const listArticlesAdmin = () => prisma.article.findMany({ orderBy: { updatedAt: "desc" } });

export async function saveArticle(actor: Actor, id: string | null, input: z.infer<typeof articleSchema>, ipHash: string) {
  try {
    return await withTx(async (tx) => {
      const before = id ? await tx.article.findUnique({ where: { id } }) : null;
      if (id && !before) throw notFound("Porada");
      const publishedAt = input.status === "PUBLISHED" ? (before?.publishedAt ?? new Date()) : (before?.publishedAt ?? null);
      const data = { ...input, publishedAt };
      const article = id ? await tx.article.update({ where: { id }, data }) : await tx.article.create({ data });
      await audit(tx, { ...actorFields(actor, ipHash), action: id ? "article.update" : "article.create", entityType: "Article", entityId: article.id, before: before && { title: before.title, status: before.status }, after: { title: article.title, status: article.status } });
      return article;
    });
  } catch (e) {
    if (isUniqueViolation(e, "slug")) throw new AppError("CONFLICT", "Porada o takim adresie (slug) już istnieje.");
    throw e;
  }
}

export async function saveGardenTask(actor: Actor, id: string | null, input: z.infer<typeof gardenTaskSchema>, ipHash: string) {
  return withTx(async (tx) => {
    const data = { ...input, interestKey: input.interestKey || null, articleSlug: input.articleSlug || null };
    const task = id ? await tx.gardenTask.update({ where: { id }, data }) : await tx.gardenTask.create({ data });
    await audit(tx, { ...actorFields(actor, ipHash), action: id ? "gardenTask.update" : "gardenTask.create", entityType: "GardenTask", entityId: task.id, after: task });
    return task;
  });
}

export async function deleteGardenTask(actor: Actor, id: string, ipHash: string) {
  return withTx(async (tx) => {
    const task = await tx.gardenTask.findUnique({ where: { id } });
    if (!task) throw notFound("Zadanie");
    await tx.gardenTask.delete({ where: { id } });
    await audit(tx, { ...actorFields(actor, ipHash), action: "gardenTask.delete", entityType: "GardenTask", entityId: id, before: task });
  });
}

// ───────── Konfiguracja programu ─────────

/** Zmiana konfiguracji tworzy nową wersję (poprzednie pozostają do audytu i kalkulacji historycznych). */
export async function updateConfig(actor: Actor, input: z.infer<typeof configSchema>, ipHash: string) {
  return withTx(async (tx) => {
    const current = await getActiveConfig(tx);
    await tx.programConfig.update({ where: { id: current.id }, data: { active: false } });
    const { id: _id, createdAt: _c, version, active: _a, createdById: _cb, note: _n, ...rest } = current;
    const next = await tx.programConfig.create({
      data: { ...rest, ...input, version: version + 1, active: true, createdById: actor.id },
    });
    await audit(tx, { ...actorFields(actor, ipHash), action: "config.update", entityType: "ProgramConfig", entityId: next.id, reason: input.note, before: current, after: next });
    return next;
  });
}

export const listConfigVersions = () => prisma.programConfig.findMany({ orderBy: { version: "desc" }, take: 20 });

export async function updateTier(actor: Actor, id: string, input: z.infer<typeof tierSchema>, ipHash: string) {
  return withTx(async (tx) => {
    const before = await tx.tier.findUnique({ where: { id } });
    if (!before) throw notFound("Poziom");
    const tier = await tx.tier.update({ where: { id }, data: input });
    await audit(tx, { ...actorFields(actor, ipHash), action: "tier.update", entityType: "Tier", entityId: id, before, after: tier });
    return tier;
  });
}

// ───────── Pracownicy, role i uprawnienia ─────────

export const listStaff = () =>
  prisma.user.findMany({ where: { kind: "STAFF" }, include: { profile: true, roles: { include: { role: true } } }, orderBy: { createdAt: "asc" } });

export const listRoles = () =>
  prisma.role.findMany({ include: { permissions: true, _count: { select: { users: true } } }, orderBy: { createdAt: "asc" } });

export async function createStaff(actor: Actor, input: z.infer<typeof staffCreateSchema>, ipHash: string) {
  const roles = await prisma.role.findMany({ where: { key: { in: input.roleKeys } } });
  if (roles.length !== input.roleKeys.length) throw new AppError("VALIDATION_ERROR", "Nieznana rola.");
  const passwordHash = await hashPassword(input.password);
  try {
    return await withTx(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          kind: "STAFF",
          profile: { create: { firstName: input.firstName, lastName: input.lastName } },
          roles: { create: roles.map((r) => ({ roleId: r.id })) },
        },
      });
      await audit(tx, { ...actorFields(actor, ipHash), action: "staff.create", entityType: "User", entityId: user.id, after: { email: user.email, roles: input.roleKeys } });
      return user;
    });
  } catch (e) {
    if (isUniqueViolation(e, "email")) throw new AppError("CONFLICT", "Konto z tym adresem e-mail już istnieje.");
    throw e;
  }
}

export async function updateStaff(actor: Actor, userId: string, input: z.infer<typeof staffRolesSchema>, ipHash: string) {
  if (userId === actor.id && (!input.active || !input.roleKeys.includes("ADMIN"))) {
    throw new AppError("CONFLICT", "Nie możesz odebrać sobie roli administratora ani zablokować własnego konta.");
  }
  const roles = await prisma.role.findMany({ where: { key: { in: input.roleKeys } } });
  return withTx(async (tx) => {
    const user = await tx.user.findFirst({ where: { id: userId, kind: "STAFF" }, include: { roles: { include: { role: true } } } });
    if (!user) throw notFound("Pracownik");
    await tx.userRole.deleteMany({ where: { userId } });
    if (roles.length) await tx.userRole.createMany({ data: roles.map((r) => ({ userId, roleId: r.id })) });
    await tx.user.update({ where: { id: userId }, data: { status: input.active ? "ACTIVE" : "BLOCKED" } });
    if (!input.active) await tx.session.deleteMany({ where: { userId } });
    await assertAdminRemains(tx);
    await audit(tx, {
      ...actorFields(actor, ipHash),
      action: "staff.update",
      entityType: "User",
      entityId: userId,
      before: { roles: user.roles.map((r) => r.role.key), status: user.status },
      after: { roles: input.roleKeys, status: input.active ? "ACTIVE" : "BLOCKED" },
    });
  });
}

export async function setRolePermissions(actor: Actor, roleId: string, permissions: string[], ipHash: string) {
  const valid = permissions.filter((p) => p in PERMISSIONS);
  return withTx(async (tx) => {
    const role = await tx.role.findUnique({ where: { id: roleId }, include: { permissions: true } });
    if (!role) throw notFound("Rola");
    if (role.key === "ADMIN" && !valid.includes("roles.manage")) {
      throw new AppError("CONFLICT", "Rola Administrator musi zachować uprawnienie do zarządzania rolami.");
    }
    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (valid.length) await tx.rolePermission.createMany({ data: valid.map((p) => ({ roleId, permissionKey: p })) });
    await audit(tx, {
      ...actorFields(actor, ipHash),
      action: "role.permissions",
      entityType: "Role",
      entityId: roleId,
      before: role.permissions.map((p) => p.permissionKey),
      after: valid,
    });
  });
}

async function assertAdminRemains(tx: Prisma.TransactionClient) {
  const admins = await tx.user.count({ where: { kind: "STAFF", status: "ACTIVE", roles: { some: { role: { key: "ADMIN" } } } } });
  if (admins === 0) throw new AppError("CONFLICT", "W systemie musi pozostać co najmniej jeden aktywny administrator.");
}

// ───────── Integracje POS ─────────

export const listIntegrations = () =>
  prisma.posIntegration.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, keyId: true, adapter: true, active: true, lastUsedAt: true, createdAt: true },
  });

export async function createPosIntegration(actor: Actor, name: string, ipHash: string) {
  const { integration, secret } = await createIntegration(name, "DEMO");
  await audit(prisma, { ...actorFields(actor, ipHash), action: "integration.create", entityType: "PosIntegration", entityId: integration.id, after: { name, keyId: integration.keyId } });
  return { id: integration.id, keyId: integration.keyId, secret };
}

export async function setIntegrationActive(actor: Actor, id: string, active: boolean, ipHash: string) {
  const integration = await prisma.posIntegration.findUnique({ where: { id } });
  if (!integration) throw notFound("Integracja");
  if (integration.adapter === "INTERNAL") throw forbidden();
  await prisma.posIntegration.update({ where: { id }, data: { active } });
  await audit(prisma, { ...actorFields(actor, ipHash), action: active ? "integration.enable" : "integration.disable", entityType: "PosIntegration", entityId: id });
}

export const listPosRequests = (onlyErrors: boolean) =>
  prisma.posRequestLog.findMany({
    where: onlyErrors ? { status: { gte: 400 } } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { integration: { select: { name: true } } },
  });

// ───────── Transakcje, audyt ─────────

export async function listTransactions(filter: { type?: "SALE" | "RETURN"; status?: "COMPLETED" | "VOIDED"; q?: string }) {
  return prisma.transaction.findMany({
    where: {
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q ? { OR: [{ externalId: { contains: filter.q, mode: "insensitive" } }, { card: { number: { contains: filter.q.replace(/\s/g, "") } } }] } : {}),
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { card: { select: { number: true, user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } } } }, integration: { select: { name: true, adapter: true } } },
  });
}

export async function getTransactionAdmin(id: string) {
  const t = await prisma.transaction.findUnique({
    where: { id },
    include: {
      items: true,
      store: true,
      integration: { select: { name: true, adapter: true } },
      ledger: { orderBy: { createdAt: "asc" } },
      redemptions: { include: { coupon: { select: { code: true, title: true } } } },
      returns: true,
      originalTransaction: { select: { id: true, externalId: true } },
      complaints: true,
      card: { select: { number: true, userId: true, user: { select: { profile: { select: { firstName: true, lastName: true } } } } } },
    },
  });
  if (!t) throw notFound("Transakcja");
  return t;
}

export async function listAudit(filter: { action?: string; entityId?: string }) {
  return prisma.auditLog.findMany({
    where: {
      ...(filter.action ? { action: { startsWith: filter.action } } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export const listComplaintsAdmin = (status?: string) =>
  prisma.complaint.findMany({
    where: status ? { status: status as "OPEN" } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      transaction: { select: { id: true, externalId: true } },
      handledBy: { select: { email: true } },
    },
  });
