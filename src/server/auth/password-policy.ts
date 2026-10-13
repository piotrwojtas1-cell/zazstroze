import { z } from "zod";

const COMMON = new Set([
  "1234567890", "12345678910", "qwertyuiop", "password123", "haslo12345", "zaq12wsxcde",
  "administrator", "1q2w3e4r5t", "qwerty12345", "polska12345", "ogrod123456", "zielony1234",
]);

/** Polityka haseł: min. 10 znaków, litera i cyfra, nie z listy popularnych. */
export const passwordSchema = z
  .string()
  .min(10, "Hasło musi mieć co najmniej 10 znaków.")
  .max(128, "Hasło może mieć najwyżej 128 znaków.")
  .refine((p) => /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(p) && /\d/.test(p), "Hasło musi zawierać literę i cyfrę.")
  .refine((p) => !COMMON.has(p.toLowerCase()), "To hasło jest zbyt popularne. Wybierz inne.");
