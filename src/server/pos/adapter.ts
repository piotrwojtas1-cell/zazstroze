import type { PosAdapterType } from "@prisma/client";
import type { SaleItemInput } from "../loyalty/transactions";

/**
 * Interfejs adaptera systemu kasowego. Adapter tłumaczy format konkretnego dostawcy POS
 * na znormalizowane struktury domenowe. Logika punktowa NIGDY nie zależy od formatu dostawcy.
 *
 * Aby podłączyć prawdziwy system: zaimplementuj PosAdapter dla formatu dostawcy,
 * dodaj wartość do enum PosAdapterType i zarejestruj adapter w `getAdapter`.
 */
export interface NormalizedIdentify {
  code: string; // zeskanowany QR lub wpisany numer karty
}

export interface NormalizedSale {
  externalId: string;
  code: string;
  storeCode?: string;
  occurredAt: Date;
  totalGrosze: number;
  items: SaleItemInput[];
}

export interface NormalizedReturn {
  externalId: string;
  originalExternalId: string;
  occurredAt: Date;
  items: { sku: string; quantity: number }[];
  reason?: string;
}

export interface NormalizedCouponRequest {
  code: string; // kod kuponu
  cardCode: string; // QR lub numer karty
  externalTransactionId: string;
  basketGrosze: number;
  items?: { category: string; totalGrosze: number }[];
}

export interface NormalizedVoid {
  externalId: string;
  reason: string;
}

export interface PosAdapter {
  readonly type: PosAdapterType;
  parseIdentify(body: unknown): NormalizedIdentify;
  parseSale(body: unknown): NormalizedSale;
  parseReturn(body: unknown): NormalizedReturn;
  parseCoupon(body: unknown): NormalizedCouponRequest;
  parseVoid(body: unknown): NormalizedVoid;
}
