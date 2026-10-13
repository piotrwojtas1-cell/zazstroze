import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Parametry argon2id zgodne z zaleceniami OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { algorithm: 2 /* Argon2id */, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, OPTIONS);

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Skrót-atrapa do weryfikacji, gdy konto nie istnieje (wyrównanie czasu odpowiedzi — utrudnia enumerację kont).
let dummyHash: Promise<string> | null = null;
export async function verifyDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing-equalization");
  await verifyPassword(await dummyHash, password);
}
