import "server-only";
import type { ConsentType } from "@prisma/client";
import { prisma, type Db } from "../db";

/** Wersje dokumentów prawnych — zmiana wersji wymaga ponownej akceptacji (do rozbudowy). */
export const DOCUMENT_VERSIONS = { terms: "2026-10-01", privacy: "2026-10-01", marketing: "2026-10-01" } as const;

export const MARKETING_TYPES: ConsentType[] = ["MARKETING_EMAIL", "MARKETING_SMS", "MARKETING_PUSH", "PERSONALIZATION"];

export const CONSENT_LABELS: Record<ConsentType, string> = {
  TERMS: "Akceptacja regulaminu programu",
  PRIVACY_ACK: "Zapoznanie się z polityką prywatności",
  MARKETING_EMAIL: "Oferty i nowości e-mailem",
  MARKETING_SMS: "Oferty SMS-em",
  MARKETING_PUSH: "Oferty w aplikacji (powiadomienia marketingowe)",
  PERSONALIZATION: "Personalizacja ofert na podstawie historii zakupów",
};

export async function currentConsents(db: Db, userId: string): Promise<Record<ConsentType, boolean>> {
  const records = await db.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  const state = {
    TERMS: false, PRIVACY_ACK: false, MARKETING_EMAIL: false, MARKETING_SMS: false, MARKETING_PUSH: false, PERSONALIZATION: false,
  } as Record<ConsentType, boolean>;
  for (const r of records) state[r.type] = r.granted;
  return state;
}

/** Zapisuje tylko faktyczne zmiany — każda zmiana to nowy wpis w historii (udzielenie lub wycofanie). */
export async function updateConsents(
  db: Db,
  userId: string,
  desired: Partial<Record<ConsentType, boolean>>,
  meta: { source: string; ipHash?: string },
) {
  const current = await currentConsents(db, userId);
  const changes = (Object.entries(desired) as [ConsentType, boolean][]).filter(([type, granted]) => current[type] !== granted);
  const records = changes.map(([type, granted]) => ({
    userId,
    type,
    granted,
    documentVersion: type === "TERMS" ? DOCUMENT_VERSIONS.terms : type === "PRIVACY_ACK" ? DOCUMENT_VERSIONS.privacy : DOCUMENT_VERSIONS.marketing,
    source: meta.source,
    ipHash: meta.ipHash,
  }));
  // Pierwszy wpis „false” przy rejestracji też zapisujemy, by udokumentować brak zgody (pole niezaznaczone).
  if (meta.source === "registration") {
    for (const [type, granted] of Object.entries(desired) as [ConsentType, boolean][]) {
      if (!granted && !records.some((r) => r.type === type)) {
        records.push({ userId, type, granted: false, documentVersion: DOCUMENT_VERSIONS.marketing, source: meta.source, ipHash: meta.ipHash });
      }
    }
  }
  if (records.length) await db.consentRecord.createMany({ data: records });
  return changes.length;
}

export const consentHistory = (userId: string) =>
  prisma.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
