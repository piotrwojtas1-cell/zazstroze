import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const sha256 = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");

export const hmacSha256 = (secret: string | Buffer, input: string) =>
  createHmac("sha256", secret).update(input).digest();

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Nieodwracalny skrót adresu IP (z pieprzem) — do limitów i logów bez przechowywania surowego IP. */
export const hashIp = (ip: string) => sha256(`${env().HASH_PEPPER}:${ip}`).slice(0, 32);

const key = () => Buffer.from(env().ENCRYPTION_KEY, "base64");

/** AES-256-GCM. Format: base64(iv).base64(tag).base64(ciphertext) */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, ct] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !ct) throw new Error("Nieprawidłowy format zaszyfrowanego sekretu");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Losowy kod kuponu bez mylących znaków (0/O, 1/I/L). */
export function couponCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += alphabet[randomInt(alphabet.length)];
  return `ZZ-${out.slice(0, 5)}-${out.slice(5)}`;
}
