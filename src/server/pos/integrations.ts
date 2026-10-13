import "server-only";
import type { PosAdapterType } from "@prisma/client";
import { prisma } from "../db";
import { encryptSecret, randomToken } from "../crypto";
import { demoAdapter } from "./demo-adapter";
import type { PosAdapter } from "./adapter";

export function getAdapter(type: PosAdapterType): PosAdapter {
  switch (type) {
    case "DEMO":
    case "INTERNAL":
      return demoAdapter;
  }
}

/** Tworzy integrację i zwraca sekret JEDNORAZOWO (w bazie przechowywany tylko w postaci zaszyfrowanej). */
export async function createIntegration(name: string, adapter: PosAdapterType = "DEMO") {
  const keyId = `pos_${randomToken(9)}`;
  const secret = randomToken(32);
  const integration = await prisma.posIntegration.create({
    data: { name, keyId, secretEncrypted: encryptSecret(secret), adapter },
  });
  return { integration, secret };
}

export const INTERNAL_INTEGRATION_KEY = "internal-demo-terminal";

/** Integracja „kasa demonstracyjna” używana przez panel (bez HMAC — autoryzacja sesją pracownika). */
export async function getInternalIntegration() {
  const existing = await prisma.posIntegration.findUnique({ where: { keyId: INTERNAL_INTEGRATION_KEY } });
  if (existing) return existing;
  return prisma.posIntegration.upsert({
    where: { keyId: INTERNAL_INTEGRATION_KEY },
    update: {},
    create: {
      name: "Kasa demonstracyjna (panel)",
      keyId: INTERNAL_INTEGRATION_KEY,
      secretEncrypted: encryptSecret(randomToken(32)),
      adapter: "INTERNAL",
    },
  });
}
