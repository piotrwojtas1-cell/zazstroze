import "server-only";
import { prisma } from "./db";
import { AppError } from "./errors";

export interface RateLimitRule {
  /** Przestrzeń nazw, np. "login:ip" */
  name: string;
  limit: number;
  windowSec: number;
}

/**
 * Limit żądań w oknie stałym, przechowywany w PostgreSQL (działa przy wielu instancjach aplikacji).
 * Operacja jest atomowa dzięki INSERT ... ON CONFLICT.
 */
export async function hit(rule: RateLimitRule, subject: string): Promise<{ allowed: boolean; count: number; retryAfterSec: number }> {
  const windowMs = rule.windowSec * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const key = `${rule.name}:${subject}`;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" = EXCLUDED."windowStart" THEN "RateLimitBucket"."count" + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart"
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);
  const retryAfterSec = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
  return { allowed: count <= rule.limit, count, retryAfterSec };
}

export async function enforce(rule: RateLimitRule, subject: string): Promise<void> {
  const r = await hit(rule, subject);
  if (!r.allowed) {
    throw new AppError("RATE_LIMITED", "Zbyt wiele prób. Spróbuj ponownie za chwilę.", { retryAfterSec: r.retryAfterSec });
  }
}

export const RULES = {
  loginIp: { name: "login:ip", limit: 30, windowSec: 900 },
  registerIp: { name: "register:ip", limit: 10, windowSec: 3600 },
  forgotIp: { name: "forgot:ip", limit: 10, windowSec: 3600 },
  forgotEmail: { name: "forgot:email", limit: 3, windowSec: 3600 },
  resetIp: { name: "reset:ip", limit: 20, windowSec: 3600 },
  redeem: { name: "redeem:user", limit: 20, windowSec: 600 },
  apiUser: { name: "api:user", limit: 300, windowSec: 60 },
  posIntegration: { name: "pos:integration", limit: 1200, windowSec: 60 },
  posIdentifyFail: { name: "pos:identify-fail", limit: 60, windowSec: 600 },
  complaint: { name: "complaint:user", limit: 5, windowSec: 3600 },
} satisfies Record<string, RateLimitRule>;
