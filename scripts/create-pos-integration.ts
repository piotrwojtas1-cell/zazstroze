/**
 * Utworzenie integracji POS z linii poleceń (alternatywa dla panelu → Integracje POS).
 *   npm run pos:create -- --name "Kasa 1" [--out .pos-demo-credentials.json]
 * Sekret wypisywany jest jednorazowo; w bazie przechowywany wyłącznie w postaci zaszyfrowanej.
 */
import { writeFileSync } from "node:fs";
import { createIntegration } from "../src/server/pos/integrations";
import { prisma } from "../src/server/db";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const name = arg("name") ?? "Kasa (CLI)";
  const { integration, secret } = await createIntegration(name, "DEMO");
  const out = arg("out");
  if (out) writeFileSync(out, JSON.stringify({ keyId: integration.keyId, secret }, null, 2));
  console.log(`keyId=${integration.keyId}${out ? ` (zapisano w ${out})` : `\nsecret=${secret}`}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
