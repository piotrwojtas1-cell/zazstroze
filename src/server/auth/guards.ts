import "server-only";
import { AppError, forbidden } from "../errors";
import type { SessionUser } from "./session";
import type { PermissionKey } from "./permissions";

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw new AppError("UNAUTHENTICATED", "Zaloguj się, aby kontynuować.");
  return user;
}

export function requireCustomer(user: SessionUser | null): SessionUser {
  const u = requireUser(user);
  if (u.kind !== "CUSTOMER") throw forbidden();
  return u;
}

export function requireStaff(user: SessionUser | null): SessionUser {
  const u = requireUser(user);
  if (u.kind !== "STAFF") throw forbidden();
  return u;
}

export const can = (user: SessionUser | null, permission: PermissionKey) =>
  !!user && user.kind === "STAFF" && user.permissions.has(permission);

export function requirePermission(user: SessionUser | null, permission: PermissionKey): SessionUser {
  const u = requireStaff(user);
  if (!u.permissions.has(permission)) throw forbidden();
  return u;
}
