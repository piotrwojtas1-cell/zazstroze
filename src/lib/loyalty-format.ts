import { formatPLN } from "./money";

export type RewardTypeName = "AMOUNT_OFF" | "PERCENT_OFF" | "FREE_PRODUCT";

export function valueLabel(type: RewardTypeName, valueGrosze: number | null, percentBp: number | null): string {
  if (type === "PERCENT_OFF") return `−${(percentBp ?? 0) / 100}%`;
  if (type === "FREE_PRODUCT") return "Gratis";
  return `−${formatPLN(valueGrosze ?? 0).replace(",00", "")}`;
}

export const LEDGER_LABELS: Record<string, string> = {
  EARN: "Zakupy",
  BONUS: "Bonus",
  REDEEM: "Wymiana na nagrodę",
  REDEEM_REVERSAL: "Zwrot punktów",
  RETURN_REVERSAL: "Zwrot towaru",
  VOID_REVERSAL: "Anulowanie transakcji",
  ADJUSTMENT: "Korekta",
  EXPIRATION: "Wygaśnięcie",
};

export const COUPON_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Dostępny",
  ACTIVATED: "Aktywowany",
  USED: "Wykorzystany",
  EXPIRED: "Wygasły",
  CANCELLED: "Anulowany",
};
