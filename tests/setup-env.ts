import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/** Ładuje .env.test (baza testowa) — testy nigdy nie używają bazy deweloperskiej. */
const file = path.resolve(__dirname, "../.env.test");
if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
    if (m) process.env[m[1]!] = m[2];
  }
}
(process.env as Record<string, string>).NODE_ENV = "test";
if (!process.env.DATABASE_URL?.includes("test")) {
  throw new Error("Testy wymagają bazy testowej (DATABASE_URL musi zawierać 'test'). Utwórz plik .env.test — patrz README.");
}
