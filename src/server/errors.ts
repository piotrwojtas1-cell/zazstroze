export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "ACCOUNT_LOCKED"
  | "INVALID_CREDENTIALS"
  | "INVALID_TOKEN"
  | "INSUFFICIENT_POINTS"
  | "REWARD_UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "LIMIT_REACHED"
  | "TIER_REQUIRED"
  | "COUPON_INVALID"
  | "COUPON_ALREADY_USED"
  | "COUPON_EXPIRED"
  | "BASKET_TOO_SMALL"
  | "CARD_NOT_FOUND"
  | "CARD_INACTIVE"
  | "QR_EXPIRED"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_MISMATCH"
  | "RETURN_EXCEEDS_SALE"
  | "INVALID_SIGNATURE"
  | "IDEMPOTENCY_KEY_REUSED"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  ACCOUNT_LOCKED: 423,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 400,
  INSUFFICIENT_POINTS: 409,
  REWARD_UNAVAILABLE: 409,
  OUT_OF_STOCK: 409,
  LIMIT_REACHED: 409,
  TIER_REQUIRED: 403,
  COUPON_INVALID: 409,
  COUPON_ALREADY_USED: 409,
  COUPON_EXPIRED: 409,
  BASKET_TOO_SMALL: 409,
  CARD_NOT_FOUND: 404,
  CARD_INACTIVE: 409,
  QR_EXPIRED: 409,
  TRANSACTION_NOT_FOUND: 404,
  TRANSACTION_MISMATCH: 422,
  RETURN_EXCEEDS_SALE: 422,
  INVALID_SIGNATURE: 401,
  IDEMPOTENCY_KEY_REUSED: 422,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
};

/** Przewidywalny błąd domenowy — komunikat jest bezpieczny do pokazania użytkownikowi. */
export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const notFound = (what = "Zasób") => new AppError("NOT_FOUND", `${what} nie istnieje lub nie masz do niego dostępu.`);
export const forbidden = () => new AppError("FORBIDDEN", "Nie masz uprawnień do wykonania tej operacji.");
