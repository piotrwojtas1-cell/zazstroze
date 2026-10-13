import "server-only";
import type { NotificationCategory } from "@prisma/client";
import type { Db } from "../db";
import { env, isProduction } from "../env";

/**
 * Wysyłka e-mail przez kolejkę EmailOutbox.
 * Dostawca „console” (domyślny, demonstracyjny) jedynie zapisuje wiadomość w bazie i wypisuje informację w logu
 * (w trybie innym niż produkcyjny — wraz z treścią, aby można było przetestować odzyskiwanie hasła lokalnie).
 * Aby wysyłać prawdziwe wiadomości, zaimplementuj adapter SMTP/API (patrz README → „E-mail”).
 */
export async function queueEmail(db: Db, msg: { to: string; subject: string; body: string; category: NotificationCategory }) {
  const row = await db.emailOutbox.create({ data: msg });
  if (env().MAIL_PROVIDER === "console") {
    if (!isProduction()) console.info(`[mail:console] Do: ${msg.to} | ${msg.subject}\n${msg.body}`);
    await db.emailOutbox.update({ where: { id: row.id }, data: { sentAt: new Date() } });
  }
  return row;
}
