import "server-only";
import { randomInt } from "node:crypto";
import type { z } from "zod";
import { prisma, withTx, isUniqueViolation, type Tx } from "../db";
import { AppError } from "../errors";
import { hashPassword, verifyDummy, verifyPassword } from "../auth/password";
import { createSession, revokeAllSessions } from "../auth/session";
import { randomToken, sha256 } from "../crypto";
import { env } from "../env";
import { enforce, RULES } from "../rate-limit";
import { updateConsents } from "./consents";
import { queueEmail } from "./mail";
import { notify } from "./notifications";
import { getTiers } from "../loyalty/tiers";
import { luhnCheckDigit } from "@/lib/luhn";
import type { registerSchema } from "./validation";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TOKEN_TTL_MIN = 30;
export const CARD_PREFIX = "2900";

export function generateCardNumber(): string {
  let body = CARD_PREFIX;
  while (body.length < 15) body += String(randomInt(10));
  return body + luhnCheckDigit(body);
}

async function issueCard(tx: Tx, userId: string) {
  const tiers = await getTiers(tx);
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = generateCardNumber();
    const exists = await tx.loyaltyCard.findUnique({ where: { number }, select: { id: true } });
    if (!exists) return tx.loyaltyCard.create({ data: { userId, number, tierId: tiers[0]?.id } });
  }
  throw new AppError("INTERNAL_ERROR", "Nie udało się wygenerować numeru karty.");
}

export async function register(input: z.infer<typeof registerSchema>, meta: { ipHash: string; userAgent?: string }) {
  await enforce(RULES.registerIp, meta.ipHash);
  const passwordHash = await hashPassword(input.password);
  const validInterests = await prisma.interest.findMany({ where: { key: { in: input.interests } }, select: { key: true } });
  try {
    const user = await withTx(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          kind: "CUSTOMER",
          profile: { create: { firstName: input.firstName } },
          commPrefs: { create: {} },
          interests: { create: validInterests.map((i) => ({ interestKey: i.key })) },
        },
      });
      await issueCard(tx, user.id);
      await updateConsents(
        tx,
        user.id,
        {
          TERMS: true,
          PRIVACY_ACK: true,
          MARKETING_EMAIL: input.marketingEmail,
          MARKETING_SMS: input.marketingSms,
          MARKETING_PUSH: input.marketingPush,
          PERSONALIZATION: input.personalization,
        },
        { source: "registration", ipHash: meta.ipHash },
      );
      await notify(tx, user.id, {
        category: "SYSTEM",
        title: `Witaj w Zielonym Zakątku, ${input.firstName}!`,
        body: "Twoja karta jest aktywna. Pokaż kod QR przy kasie, aby zbierać punkty za każde zakupy.",
        link: "/karta",
      });
      return user;
    });
    const session = await createSession(user, meta);
    return { user, session };
  } catch (error) {
    if (isUniqueViolation(error, "email")) {
      throw new AppError("CONFLICT", "Nie udało się utworzyć konta z tym adresem. Jeśli masz już konto, zaloguj się lub odzyskaj hasło.");
    }
    throw error;
  }
}

export async function login(input: { email: string; password: string }, meta: { ipHash: string; userAgent?: string }) {
  await enforce(RULES.loginIp, meta.ipHash);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const invalid = new AppError("INVALID_CREDENTIALS", "Nieprawidłowy e-mail lub hasło.");
  if (!user || user.status === "DELETED") {
    await verifyDummy(input.password);
    throw invalid;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("ACCOUNT_LOCKED", "Zbyt wiele nieudanych prób. Konto jest tymczasowo zablokowane — spróbuj za kilkanaście minut lub odzyskaj hasło.");
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: failed >= MAX_FAILED_LOGINS
        ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedLoginCount: failed },
    });
    throw invalid;
  }
  if (user.status === "BLOCKED") throw new AppError("FORBIDDEN", "Konto jest zablokowane. Skontaktuj się ze sklepem.");
  await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } });
  const session = await createSession(user, meta);
  return { user, session };
}

/** Zawsze kończy się sukcesem (bez ujawniania, czy konto istnieje). */
export async function requestPasswordReset(email: string, meta: { ipHash: string }) {
  await enforce(RULES.forgotIp, meta.ipHash);
  const allowedForEmail = await enforce(RULES.forgotEmail, sha256(email)).then(() => true, () => false);
  if (!allowedForEmail) return;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = randomToken(32);
  await withTx(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60_000) },
    });
    const link = `${env().APP_URL}/reset-hasla?token=${encodeURIComponent(token)}`;
    await queueEmail(tx, {
      to: user.email,
      subject: "Zielony Zakątek — ustaw nowe hasło",
      body: `Otrzymaliśmy prośbę o zmianę hasła.\n\nUstaw nowe hasło: ${link}\n\nLink jest ważny ${RESET_TOKEN_TTL_MIN} minut. Jeśli to nie Ty, zignoruj tę wiadomość — Twoje hasło pozostanie bez zmian.`,
      category: "TRANSACTIONAL",
    });
  });
}

export async function resetPassword(token: string, newPassword: string, meta: { ipHash: string }) {
  await enforce(RULES.resetIp, meta.ipHash);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError("INVALID_TOKEN", "Link do zmiany hasła jest nieprawidłowy lub wygasł. Poproś o nowy.");
  }
  const passwordHash = await hashPassword(newPassword);
  await withTx(async (tx) => {
    const used = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) throw new AppError("INVALID_TOKEN", "Link został już wykorzystany.");
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await notify(tx, record.userId, {
      category: "SYSTEM",
      title: "Hasło zostało zmienione",
      body: "Jeśli to nie Ty zmieniłeś(-aś) hasło, natychmiast skontaktuj się ze sklepem.",
    });
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, meta: { ipHash: string; userAgent?: string }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError("INVALID_CREDENTIALS", "Obecne hasło jest nieprawidłowe.");
  }
  const passwordHash = await hashPassword(newPassword);
  // passwordChangedAt unieważnia pozostałe sesje; od razu wydajemy nową dla bieżącego urządzenia.
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date(Date.now() - 1) } });
  await revokeAllSessions(userId);
  return createSession(user, meta);
}
