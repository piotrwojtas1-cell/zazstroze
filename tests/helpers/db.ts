import { prisma } from "@/server/db";
import { PERMISSIONS, DEFAULT_ROLES } from "@/server/auth/permissions";
import { getInternalIntegration } from "@/server/pos/integrations";
import { hashPassword } from "@/server/auth/password";
import { generateCardNumber } from "@/server/services/auth";

const TABLES = [
  "AuditLog", "PointsLedger", "CouponRedemption", "Coupon", "TransactionItem", "Transaction", "PosRequestLog", "PosIntegration",
  "Complaint", "DataRequest", "Notification", "EmailOutbox", "ConsentRecord", "CommunicationPreference", "ShoppingListItem",
  "FavoriteProduct", "UserInterest", "Session", "PasswordResetToken", "UserRole", "LoyaltyCard", "Profile", "User",
  "RolePermission", "Role", "Permission", "Reward", "Campaign", "Tier", "ProgramConfig", "Interest", "Article", "GardenTask",
  "Product", "Store", "RateLimitBucket",
];

/** Czyści bazę testową i wgrywa minimalne dane referencyjne. TRUNCATE nie uruchamia triggerów wierszowych. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  for (const [key, description] of Object.entries(PERMISSIONS)) await prisma.permission.create({ data: { key, description } });
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    await prisma.role.create({ data: { key, name: role.name, description: role.description, permissions: { create: role.permissions.map((p) => ({ permissionKey: p })) } } });
  }
  await prisma.tier.createMany({
    data: [
      { key: "SADZONKA", name: "Sadzonka", description: "start", minPoints: 0, multiplierBp: 10000, sortOrder: 1 },
      { key: "KRZEW", name: "Krzew", description: "środek", minPoints: 800, multiplierBp: 11000, sortOrder: 2 },
      { key: "DAB", name: "Dąb", description: "top", minPoints: 2500, multiplierBp: 12500, sortOrder: 3 },
    ],
  });
  await prisma.programConfig.create({
    data: { version: 1, active: true, earnRateBp: 10000, rounding: "FLOOR", minQualifyingGrosze: 100, excludedCategories: ["karty-podarunkowe", "kaucje"], maxManualAdjustment: 500 },
  });
  await prisma.interest.createMany({ data: [{ key: "warzywnik", name: "Warzywnik", emoji: "🥕" }, { key: "kwiaty", name: "Kwiaty", emoji: "🌷" }] });
  await prisma.store.create({ data: { code: "ZZ-01", name: "Sklep testowy", street: "ul. Testowa 1", city: "Test", postalCode: "00-001", phone: "+48 22 000 00 00", email: "sklep@example.com", openingHours: [] } });
  await getInternalIntegration();
}

let seq = 0;
export async function createCustomer(opts: { email?: string; password?: string; firstName?: string } = {}) {
  const n = ++seq;
  const tier = await prisma.tier.findFirstOrThrow({ where: { key: "SADZONKA" } });
  return prisma.user.create({
    data: {
      email: opts.email ?? `klient${n}-${Date.now()}@example.com`,
      passwordHash: await hashPassword(opts.password ?? "TestoweHaslo123"),
      kind: "CUSTOMER",
      profile: { create: { firstName: opts.firstName ?? "Testowy", lastName: "Klient" } },
      card: { create: { number: generateCardNumber(), tierId: tier.id } },
    },
    include: { card: true, profile: true },
  });
}

export async function createStaff(role: "ADMIN" | "MANAGER" | "STAFF", email = `${role.toLowerCase()}-${Date.now()}-${++seq}@example.com`) {
  const r = await prisma.role.findUniqueOrThrow({ where: { key: role } });
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("PracownikHaslo123"),
      kind: "STAFF",
      profile: { create: { firstName: role } },
      roles: { create: [{ roleId: r.id }] },
    },
  });
}

export async function createReward(data: Partial<{ name: string; pointsCost: number; valueGrosze: number; minBasketGrosze: number; stock: number | null; perCustomerLimit: number | null; validDays: number }> = {}) {
  return prisma.reward.create({
    data: {
      name: data.name ?? "Rabat 5 zł",
      description: "Kupon testowy",
      type: "AMOUNT_OFF",
      pointsCost: data.pointsCost ?? 100,
      valueGrosze: data.valueGrosze ?? 500,
      minBasketGrosze: data.minBasketGrosze ?? 2000,
      validDays: data.validDays ?? 30,
      stock: data.stock ?? null,
      perCustomerLimit: data.perCustomerLimit ?? null,
      excludedCategories: ["karty-podarunkowe"],
    },
  });
}

export const item = (sku: string, category: string, quantity: number, unitPriceGrosze: number, discountGrosze = 0) => ({
  sku,
  name: `Produkt ${sku}`,
  category,
  quantity,
  unitPriceGrosze,
  discountGrosze,
});

export const total = (items: ReturnType<typeof item>[]) => items.reduce((s, i) => s + i.quantity * i.unitPriceGrosze - i.discountGrosze, 0);
