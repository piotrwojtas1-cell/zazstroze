import { z } from "zod";
import type { PosAdapter } from "./adapter";

/**
 * Adapter DEMONSTRACYJNY — kanoniczny format JSON tej aplikacji (patrz docs/API.md, sekcja POS).
 * Nie odpowiada żadnemu konkretnemu systemowi kasowemu.
 */
const grosze = z.number().int().min(0).max(100_000_000);
/** Data transakcji — wymagany ciąg ISO 8601 (bez niejawnej konwersji null → 1970). */
const isoDate = z.string().min(10).max(40).pipe(z.coerce.date());
const id = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._:\/-]+$/, "Niedozwolone znaki w identyfikatorze");

const item = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(64),
  quantity: z.number().int().min(1).max(10_000),
  unitPriceGrosze: grosze,
  discountGrosze: grosze.default(0),
});

const saleSchema = z.object({
  externalId: id,
  cardCode: z.string().trim().min(1).max(200),
  storeCode: z.string().trim().max(32).optional(),
  occurredAt: isoDate,
  totalGrosze: grosze,
  items: z.array(item).min(1).max(500),
});

const returnSchema = z.object({
  externalId: id,
  originalExternalId: id,
  occurredAt: isoDate,
  reason: z.string().trim().max(300).optional(),
  items: z.array(z.object({ sku: z.string().trim().min(1).max(64), quantity: z.number().int().min(1).max(10_000) })).min(1).max(500),
});

const couponSchema = z.object({
  couponCode: z.string().trim().min(4).max(32),
  cardCode: z.string().trim().min(1).max(200),
  externalTransactionId: id,
  basketGrosze: grosze,
  items: z.array(z.object({ category: z.string().trim().min(1).max(64), totalGrosze: grosze })).max(500).optional(),
});

const identifySchema = z.object({ cardCode: z.string().trim().min(1).max(200) });
const voidSchema = z.object({ externalId: id, reason: z.string().trim().min(3).max(300) });

export const demoAdapter: PosAdapter = {
  type: "DEMO",
  parseIdentify: (body) => ({ code: identifySchema.parse(body).cardCode }),
  parseSale: (body) => {
    const b = saleSchema.parse(body);
    return { externalId: b.externalId, code: b.cardCode, storeCode: b.storeCode, occurredAt: b.occurredAt, totalGrosze: b.totalGrosze, items: b.items };
  },
  parseReturn: (body) => returnSchema.parse(body),
  parseCoupon: (body) => {
    const b = couponSchema.parse(body);
    return { code: b.couponCode, cardCode: b.cardCode, externalTransactionId: b.externalTransactionId, basketGrosze: b.basketGrosze, items: b.items };
  },
  parseVoid: (body) => voidSchema.parse(body),
};

export const demoSchemas = { saleSchema, returnSchema, couponSchema, identifySchema, voidSchema };
