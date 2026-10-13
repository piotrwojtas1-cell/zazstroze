import { z } from "zod";
import { emailSchema, nameSchema } from "./validation";
import { passwordSchema } from "../auth/password-policy";

const optionalDate = z
  .union([z.literal(""), z.null(), z.coerce.date()])
  .optional()
  .transform((v) => (v instanceof Date ? v : null));

/** Wymagana data — odrzuca null/""/liczby (z.coerce.date zamieniłby null na 1970-01-01). */
const requiredDate = z.union([z.string().min(1), z.date()]).pipe(z.coerce.date());

const categories = z.array(z.string().trim().min(1).max(64)).max(50).default([]);

export const rewardSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(3).max(1000),
    type: z.enum(["AMOUNT_OFF", "PERCENT_OFF", "FREE_PRODUCT"]),
    pointsCost: z.number().int().min(1).max(1_000_000),
    valueGrosze: z.number().int().min(1).max(10_000_000).nullable().optional(),
    percentBp: z.number().int().min(1).max(10_000).nullable().optional(),
    minBasketGrosze: z.number().int().min(0).max(10_000_000).default(0),
    maxDiscountGrosze: z.number().int().min(1).max(10_000_000).nullable().optional(),
    excludedCategories: categories,
    validDays: z.number().int().min(1).max(730).default(30),
    stock: z.number().int().min(0).max(1_000_000).nullable().optional(),
    perCustomerLimit: z.number().int().min(1).max(1000).nullable().optional(),
    requiredTierId: z.string().max(64).nullable().optional(),
    imageEmoji: z.string().trim().min(1).max(8).default("🎁"),
    active: z.boolean().default(true),
    startsAt: optionalDate,
    endsAt: optionalDate,
    sortOrder: z.number().int().min(0).max(10_000).default(0),
  })
  .superRefine((r, ctx) => {
    if (r.type === "PERCENT_OFF" && !r.percentBp) ctx.addIssue({ code: "custom", path: ["percentBp"], message: "Podaj procent rabatu." });
    if (r.type !== "PERCENT_OFF" && !r.valueGrosze) ctx.addIssue({ code: "custom", path: ["valueGrosze"], message: "Podaj wartość nagrody." });
    if (r.startsAt && r.endsAt && r.endsAt <= r.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Data końca musi być po dacie startu." });
  });

export const campaignSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(3).max(1000),
    type: z.enum(["POINTS_MULTIPLIER", "BONUS_POINTS", "SEASONAL_OFFER"]),
    multiplierBp: z.number().int().min(10_001).max(100_000).nullable().optional(),
    bonusPoints: z.number().int().min(1).max(100_000).nullable().optional(),
    minBasketGrosze: z.number().int().min(0).max(10_000_000).default(0),
    categories,
    tierKeys: z.array(z.string().max(40)).max(10).default([]),
    interestKeys: z.array(z.string().max(40)).max(20).default([]),
    startsAt: requiredDate,
    endsAt: requiredDate,
    active: z.boolean().default(true),
    showInApp: z.boolean().default(true),
    imageEmoji: z.string().trim().min(1).max(8).default("🌱"),
    ctaLabel: z.string().trim().max(60).nullable().optional(),
  })
  .superRefine((c, ctx) => {
    if (c.endsAt <= c.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Data końca musi być po dacie startu." });
    if (c.type === "POINTS_MULTIPLIER" && !c.multiplierBp) ctx.addIssue({ code: "custom", path: ["multiplierBp"], message: "Podaj mnożnik (> 1)." });
    if (c.type === "BONUS_POINTS" && !c.bonusPoints) ctx.addIssue({ code: "custom", path: ["bonusPoints"], message: "Podaj liczbę punktów bonusu." });
  });

export const articleSchema = z.object({
  slug: z.string().trim().min(3).max(100).regex(/^[a-z0-9-]+$/, "Tylko małe litery, cyfry i myślniki."),
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().min(10).max(400),
  body: z.string().trim().min(20).max(20_000),
  category: z.string().trim().min(2).max(60),
  interestKeys: z.array(z.string().max(40)).max(20).default([]),
  months: z.array(z.number().int().min(1).max(12)).max(12).default([]),
  readMinutes: z.number().int().min(1).max(60).default(3),
  emoji: z.string().trim().min(1).max(8).default("🌿"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export const gardenTaskSchema = z.object({
  month: z.number().int().min(1).max(12),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(600),
  interestKey: z.string().max(40).nullable().optional(),
  articleSlug: z.string().max(100).nullable().optional(),
  sort: z.number().int().min(0).max(1000).default(0),
});

export const configSchema = z.object({
  earnRateBp: z.number().int().min(0).max(1_000_000),
  rounding: z.enum(["FLOOR", "HALF_UP"]),
  minQualifyingGrosze: z.number().int().min(0).max(10_000_000),
  excludedCategories: categories,
  tierWindowDays: z.number().int().min(30).max(1095),
  maxManualAdjustment: z.number().int().min(1).max(1_000_000),
  allowNegativeBalance: z.boolean(),
  couponDefaultValidDays: z.number().int().min(1).max(730),
  pointValueGroszeInfo: z.number().int().min(0).max(10_000),
  note: z.string().trim().min(5, "Opisz powód zmiany (min. 5 znaków).").max(500),
});

export const tierSchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().min(3).max(300),
  minPoints: z.number().int().min(0).max(10_000_000),
  multiplierBp: z.number().int().min(10_000).max(50_000),
  benefits: z.array(z.string().trim().min(2).max(120)).max(10),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const adjustSchema = z.object({
  points: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0, "Podaj niezerową liczbę punktów."),
  reason: z.string().trim().min(10, "Powód korekty musi mieć co najmniej 10 znaków.").max(500),
});

export const cardStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED"]),
  reason: z.string().trim().min(5).max(500),
});

export const cancelCouponSchema = z.object({
  refundPoints: z.boolean(),
  reason: z.string().trim().min(5).max(500),
});

export const complaintUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]),
  resolution: z.string().trim().max(1000).optional(),
});

export const staffCreateSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema.optional(),
  password: passwordSchema,
  roleKeys: z.array(z.string().max(40)).min(1).max(5),
});

export const staffRolesSchema = z.object({ roleKeys: z.array(z.string().max(40)).max(5), active: z.boolean() });

export const rolePermissionsSchema = z.object({ permissions: z.array(z.string().max(60)).max(100) });

export const integrationCreateSchema = z.object({ name: z.string().trim().min(3).max(80) });

export const reportRangeSchema = z.object({
  from: requiredDate.optional(),
  to: requiredDate.optional(),
});
