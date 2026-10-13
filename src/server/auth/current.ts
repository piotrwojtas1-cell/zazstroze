import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "./session";
import type { PermissionKey } from "./permissions";

/** Bieżący użytkownik w komponentach serwerowych (jedno zapytanie na żądanie dzięki `cache`). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
});

export async function requireCustomerPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/witaj");
  if (user.kind === "STAFF") redirect("/admin");
  return user;
}

export async function requireStaffPage(permission?: PermissionKey): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logowanie?next=/admin");
  if (user.kind !== "STAFF") redirect("/");
  if (permission && !user.permissions.has(permission)) redirect("/admin/brak-dostepu");
  return user;
}
