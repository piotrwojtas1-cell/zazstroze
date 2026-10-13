/**
 * Utworzenie pierwszego administratora (lub nadanie roli ADMIN istniejącemu pracownikowi).
 *   npm run admin:create -- --email admin@twojsklep.pl --name "Jan"
 * Hasło jest pobierane ze zmiennej ADMIN_PASSWORD albo generowane losowo i wypisywane jednorazowo.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { passwordSchema } from "../src/server/auth/password-policy";
import { PERMISSIONS, DEFAULT_ROLES } from "../src/server/auth/permissions";

const prisma = new PrismaClient();
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const firstName = arg("name") ?? "Administrator";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Podaj poprawny adres: --email admin@example.com");

  // Upewnij się, że katalog uprawnień i role istnieją (np. gdy seed nie był uruchomiony).
  for (const [key, description] of Object.entries(PERMISSIONS)) await prisma.permission.upsert({ where: { key }, update: {}, create: { key, description } });
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    if (!(await prisma.role.findUnique({ where: { key } }))) {
      await prisma.role.create({ data: { key, name: role.name, description: role.description, permissions: { create: role.permissions.map((p) => ({ permissionKey: p })) } } });
    }
  }
  const admin = await prisma.role.findUniqueOrThrow({ where: { key: "ADMIN" } });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.kind !== "STAFF") throw new Error("Ten adres należy do konta klienta — użyj innego adresu dla konta pracownika.");
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: existing.id, roleId: admin.id } }, update: {}, create: { userId: existing.id, roleId: admin.id } });
    console.log(`Nadano rolę Administrator kontu ${email}.`);
    return;
  }
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD ?? `${randomBytes(9).toString("base64url")}9a`;
  passwordSchema.parse(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      kind: "STAFF",
      profile: { create: { firstName } },
      roles: { create: [{ roleId: admin.id }] },
    },
  });
  await prisma.auditLog.create({ data: { actorLabel: "cli:create-admin", action: "staff.create", entityType: "User", after: { email, roles: ["ADMIN"] } } });
  console.log(`Utworzono administratora ${email}.`);
  if (generated) console.log(`Hasło tymczasowe (zapisz je i zmień po zalogowaniu): ${password}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
