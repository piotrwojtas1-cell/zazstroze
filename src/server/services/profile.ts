import "server-only";
import type { z } from "zod";
import { prisma, withTx } from "../db";
import { AppError } from "../errors";
import { audit } from "../audit";
import { verifyPassword, hashPassword } from "../auth/password";
import { randomToken } from "../crypto";
import { currentConsents, consentHistory, updateConsents } from "./consents";
import type { consentsSchema, profileSchema } from "./validation";

export async function updateProfile(userId: string, input: z.infer<typeof profileSchema>) {
  return prisma.profile.update({
    where: { userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      postalCode: input.postalCode ?? null,
      birthMonth: input.birthMonth ?? null,
    },
  });
}

export async function setConsents(userId: string, input: z.infer<typeof consentsSchema>, ipHash: string) {
  await updateConsents(
    prisma,
    userId,
    {
      MARKETING_EMAIL: input.marketingEmail,
      MARKETING_SMS: input.marketingSms,
      MARKETING_PUSH: input.marketingPush,
      PERSONALIZATION: input.personalization,
    },
    { source: "profile", ipHash },
  );
  return currentConsents(prisma, userId);
}

export async function setInterests(userId: string, keys: string[]) {
  const valid = await prisma.interest.findMany({ where: { key: { in: keys } }, select: { key: true } });
  await withTx(async (tx) => {
    await tx.userInterest.deleteMany({ where: { userId } });
    if (valid.length) await tx.userInterest.createMany({ data: valid.map((v) => ({ userId, interestKey: v.key })) });
  });
  return valid.map((v) => v.key);
}

/** Eksport danych osobowych (prawo dostępu / przenoszenia) w formacie JSON. */
export async function exportUserData(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      profile: true,
      interests: true,
      favorites: { include: { product: { select: { name: true, sku: true } } } },
      shoppingList: true,
      notifications: true,
      complaints: true,
      commPrefs: true,
      card: {
        include: {
          tier: { select: { name: true } },
          ledger: { orderBy: { createdAt: "asc" } },
          coupons: true,
          transactions: { include: { items: true }, orderBy: { occurredAt: "asc" } },
        },
      },
    },
  });
  const consents = await consentHistory(userId);
  await prisma.dataRequest.create({ data: { userId, type: "EXPORT", status: "COMPLETED" } });
  const { passwordHash: _ph, failedLoginCount: _f, lockedUntil: _l, ...account } = user;
  return {
    exportedAt: new Date().toISOString(),
    note: "Eksport danych przetwarzanych w programie lojalnościowym Zielony Zakątek.",
    account,
    consents: consents.map(({ ipHash: _ip, ...c }) => c),
  };
}

/**
 * Usunięcie konta = anonimizacja. Dane transakcyjne i rejestr punktów są zachowywane bez danych osobowych
 * (wymogi rachunkowe i spójność rejestru). Okresy retencji wymagają weryfikacji prawnej — patrz docs/PRIVACY.md.
 */
export async function deleteAccount(userId: string, password: string, ipHash: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, password))) throw new AppError("INVALID_CREDENTIALS", "Nieprawidłowe hasło.");
  const unusable = await hashPassword(randomToken(32));
  await withTx(async (tx) => {
    await updateConsents(tx, userId, { MARKETING_EMAIL: false, MARKETING_SMS: false, MARKETING_PUSH: false, PERSONALIZATION: false }, { source: "deletion" });
    await tx.user.update({
      where: { id: userId },
      data: { email: `deleted+${userId}@anonymized.invalid`, passwordHash: unusable, status: "DELETED", deletedAt: new Date() },
    });
    await tx.profile.update({ where: { userId }, data: { firstName: "Konto usunięte", lastName: null, phone: null, postalCode: null, birthMonth: null } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.userInterest.deleteMany({ where: { userId } });
    await tx.favoriteProduct.deleteMany({ where: { userId } });
    await tx.shoppingListItem.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    const card = await tx.loyaltyCard.findUnique({ where: { userId } });
    if (card) {
      await tx.loyaltyCard.update({ where: { id: card.id }, data: { status: "CLOSED" } });
      await tx.coupon.updateMany({ where: { cardId: card.id, status: { in: ["AVAILABLE", "ACTIVATED"] } }, data: { status: "CANCELLED" } });
    }
    await tx.dataRequest.create({ data: { userId, type: "DELETION", status: "COMPLETED", note: "Anonimizacja na żądanie klienta" } });
    await audit(tx, { actorUserId: null, actorLabel: "klient (samoobsługa)", action: "account.delete", entityType: "User", entityId: userId, ipHash });
  });
}
