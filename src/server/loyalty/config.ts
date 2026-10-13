import "server-only";
import type { ProgramConfig } from "@prisma/client";
import type { Db } from "../db";
import { AppError } from "../errors";

/** Aktywna konfiguracja programu. Brak konfiguracji to błąd wdrożenia (uruchom seed lub utwórz ją w panelu). */
export async function getActiveConfig(db: Db): Promise<ProgramConfig> {
  const config = await db.programConfig.findFirst({ where: { active: true }, orderBy: { version: "desc" } });
  if (!config) throw new AppError("INTERNAL_ERROR", "Brak aktywnej konfiguracji programu lojalnościowego.");
  return config;
}

/** Maksymalne opóźnienie transakcji przesłanej przez POS (np. po awarii łącza). */
export const MAX_TRANSACTION_AGE_DAYS = 14;
/** Dopuszczalne przesunięcie zegara kasy w przyszłość. */
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
