import { z } from "zod";
import { passwordSchema } from "../auth/password-policy";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Podaj adres e-mail.")
  .max(254)
  .email("Podaj poprawny adres e-mail.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "To pole jest wymagane.")
  .max(60, "Maksymalnie 60 znaków.")
  .regex(/^[\p{L}][\p{L}\s'.-]*$/u, "Użyj liter (dozwolone także spacja, myślnik, apostrof).");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+48\s?)?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/, "Podaj numer w formacie 600 100 200 lub +48 600 100 200.");

export const postalCodeSchema = z.string().trim().regex(/^\d{2}-\d{3}$/, "Kod pocztowy w formacie 00-000.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Akceptacja regulaminu jest wymagana." }) }),
  acknowledgePrivacy: z.literal(true, { errorMap: () => ({ message: "Potwierdź zapoznanie się z polityką prywatności." }) }),
  marketingEmail: z.boolean().default(false),
  marketingSms: z.boolean().default(false),
  marketingPush: z.boolean().default(false),
  personalization: z.boolean().default(false),
  interests: z.array(z.string().max(40)).max(20).default([]),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Podaj hasło.").max(128),
});

export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema });

export const profileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema.optional().or(z.literal("").transform(() => undefined)),
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  postalCode: postalCodeSchema.optional().or(z.literal("").transform(() => undefined)),
  birthMonth: z.number().int().min(1).max(12).nullable().optional(),
});

export const consentsSchema = z.object({
  marketingEmail: z.boolean(),
  marketingSms: z.boolean(),
  marketingPush: z.boolean(),
  personalization: z.boolean(),
});

export const idParam = z.string().min(1).max(64);
