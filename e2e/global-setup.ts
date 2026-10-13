import { execSync } from "node:child_process";

/** Czyści bazę e2e (dedykowaną testom), wgrywa migracje i dane demonstracyjne. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("_e2e")) throw new Error("E2E wymaga dedykowanej bazy *_e2e");
  const run = (cmd: string) => execSync(cmd, { stdio: "inherit", env: process.env });
  run("npx prisma migrate deploy");
  run(`psql "${url.replace("?schema=public", "")}" -q -c "DO \\$\\$ DECLARE r record; BEGIN FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' LOOP EXECUTE 'TRUNCATE TABLE \\"' || r.tablename || '\\" CASCADE'; END LOOP; END \\$\\$;"`);
  execSync("npx tsx --conditions=react-server prisma/seed.ts", { stdio: "inherit", env: { ...process.env, POS_CREDENTIALS_FILE: ".pos-e2e-credentials.json" } });
}
