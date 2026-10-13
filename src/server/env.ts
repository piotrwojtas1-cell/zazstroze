import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "ENCRYPTION_KEY musi mieć 32 bajty w base64"),
  CARD_QR_SECRET: z.string().min(32),
  HASH_PEPPER: z.string().min(32),
  DEMO_MODE: z.enum(["true", "false"]).default("false"),
  MAIL_PROVIDER: z.enum(["console"]).default("console"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

type Env = z.infer<typeof schema>;
let cached: Env | null = null;

/** Zwalidowane zmienne środowiskowe. Rzuca czytelny błąd przy brakującej konfiguracji. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Nieprawidłowa konfiguracja środowiska: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isDemoMode = () => env().DEMO_MODE === "true";
export const isProduction = () => env().NODE_ENV === "production";
export const isSecureOrigin = () => env().APP_URL.startsWith("https://");
