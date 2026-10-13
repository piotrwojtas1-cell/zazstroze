import "server-only";
import type { User, Profile } from "@prisma/client";
import { prisma } from "../db";
import { randomToken, sha256 } from "../crypto";
import { isSecureOrigin } from "../env";
import type { PermissionKey } from "./permissions";

export const SESSION_COOKIE = "zz_session";
const CUSTOMER_TTL_MS = 30 * 24 * 3600 * 1000; // 30 dni
const STAFF_TTL_MS = 12 * 3600 * 1000; // 12 godzin — krótsze sesje dla kont z uprawnieniami
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  kind: User["kind"];
  firstName: string;
  roles: string[];
  permissions: Set<PermissionKey>;
  sessionId: string;
}

export async function createSession(user: Pick<User, "id" | "kind">, meta: { ipHash?: string; userAgent?: string }) {
  const token = randomToken(32);
  const ttl = user.kind === "STAFF" ? STAFF_TTL_MS : CUSTOMER_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  await prisma.session.create({
    data: {
      id: sha256(token),
      userId: user.id,
      expiresAt,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent?.slice(0, 255),
    },
  });
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isSecureOrigin(),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export const clearedSessionCookie = () => ({ ...sessionCookie("", new Date(0)), maxAge: 0 });

type UserWithAuth = User & {
  profile: Profile | null;
  roles: { role: { key: string; permissions: { permissionKey: string }[] } }[];
};

function toSessionUser(user: UserWithAuth, sessionId: string): SessionUser {
  const permissions = new Set<PermissionKey>();
  for (const ur of user.roles) for (const p of ur.role.permissions) permissions.add(p.permissionKey as PermissionKey);
  return {
    id: user.id,
    email: user.email,
    kind: user.kind,
    firstName: user.profile?.firstName ?? "",
    roles: user.roles.map((r) => r.role.key),
    permissions: user.kind === "STAFF" ? permissions : new Set(),
    sessionId,
  };
}

/** Weryfikuje token sesji i zwraca użytkownika wraz z uprawnieniami (lub null). */
export async function getSessionUser(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 128) return null;
  const id = sha256(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          profile: true,
          roles: { include: { role: { include: { permissions: { select: { permissionKey: true } } } } } },
        },
      },
    },
  });
  if (!session) return null;
  const now = Date.now();
  if (session.expiresAt.getTime() <= now || session.user.status !== "ACTIVE") {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  // Sesje wydane przed zmianą hasła są nieważne.
  if (session.createdAt < session.user.passwordChangedAt) {
    await prisma.session.deleteMany({ where: { id } });
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return toSessionUser(session.user, id);
}

export async function revokeSession(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { id: sha256(token) } });
}

export const revokeAllSessions = (userId: string) => prisma.session.deleteMany({ where: { userId } });
