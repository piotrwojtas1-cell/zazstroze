/**
 * Seed bazy danych.
 *  - Zawsze: uprawnienia, role, poziomy, konfiguracja programu (v1, demonstracyjna), zainteresowania, sklep,
 *    produkty, porady, kalendarz, przykładowe nagrody i kampanie (tylko jeśli tabele są puste).
 *  - Tylko gdy DEMO_MODE=true lub SEED_DEMO=true: konta pracowników demo, fikcyjni klienci i historia transakcji.
 * Nie zawiera prawdziwych danych osobowych.
 *
 * Uruchomienie: npm run db:seed
 */
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, DEFAULT_ROLES } from "../src/server/auth/permissions";
import { hashPassword } from "../src/server/auth/password";
import { createIntegration, getInternalIntegration } from "../src/server/pos/integrations";
import { recordSale, recordReturn } from "../src/server/loyalty/transactions";
import { redeemReward } from "../src/server/loyalty/rewards";
import { redeemCoupon, expireCoupons } from "../src/server/loyalty/coupons";
import { recomputeTier } from "../src/server/loyalty/tiers";
import { generateCardNumber } from "../src/server/services/auth";
import { DOCUMENT_VERSIONS } from "../src/server/services/consents";
import { ARTICLES, DEMO_FIRST_NAMES, DEMO_LAST_NAMES, GARDEN_TASKS, INTERESTS, PRODUCTS, REWARDS, TIERS } from "./seed-data";

const prisma = new PrismaClient();
const DAY = 86_400_000;

// Deterministyczny generator liczb pseudolosowych — powtarzalne dane demo.
let rngState = 20261013;
function rand() {
  rngState = (rngState * 1103515245 + 12345) % 2 ** 31;
  return rngState / 2 ** 31;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

async function seedReference() {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  }
  for (const [key, role] of Object.entries(DEFAULT_ROLES)) {
    const existing = await prisma.role.findUnique({ where: { key } });
    if (!existing) {
      await prisma.role.create({
        data: { key, name: role.name, description: role.description, permissions: { create: role.permissions.map((p) => ({ permissionKey: p })) } },
      });
    }
  }
  for (const t of TIERS) {
    await prisma.tier.upsert({ where: { key: t.key }, update: {}, create: t });
  }
  if ((await prisma.programConfig.count()) === 0) {
    await prisma.programConfig.create({
      data: {
        version: 1,
        active: true,
        earnRateBp: 10000, // 1 pkt za 1 zł — WARTOŚĆ DEMONSTRACYJNA
        rounding: "FLOOR",
        minQualifyingGrosze: 100,
        excludedCategories: ["karty-podarunkowe", "kaucje"],
        tierWindowDays: 365,
        maxManualAdjustment: 500,
        allowNegativeBalance: true,
        couponDefaultValidDays: 30,
        pointValueGroszeInfo: 5, // 100 pkt ≈ 5 zł — WARTOŚĆ DEMONSTRACYJNA
        note: "Konfiguracja demonstracyjna — nie jest zatwierdzoną polityką biznesową.",
      },
    });
  }
  for (const [i, it] of INTERESTS.entries()) {
    await prisma.interest.upsert({ where: { key: it.key }, update: { name: it.name, emoji: it.emoji, sort: i }, create: { ...it, sort: i } });
  }
  await prisma.store.upsert({
    where: { code: "ZZ-01" },
    update: {},
    create: {
      code: "ZZ-01",
      name: "Zielony Zakątek — Centrum Ogrodnicze",
      street: "ul. Słonecznikowa 12",
      city: "Ogrodowo",
      postalCode: "00-950",
      phone: "+48 22 100 20 30",
      email: "kontakt@zielonyzakatek.example",
      openingHours: [
        { days: "Poniedziałek – piątek", hours: "8:00 – 19:00" },
        { days: "Sobota", hours: "8:00 – 17:00" },
        { days: "Niedziela handlowa", hours: "10:00 – 16:00" },
      ],
      latitude: 52.2297,
      longitude: 21.0122,
    },
  });
  for (const p of PRODUCTS) {
    await prisma.product.upsert({ where: { sku: p.sku }, update: { name: p.name, priceGrosze: p.priceGrosze }, create: p });
  }
  await getInternalIntegration();
}

async function seedContent(now: Date) {
  for (const a of ARTICLES) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: { ...a, status: "PUBLISHED", publishedAt: new Date(now.getTime() - between(2, 120) * DAY) },
    });
  }
  if ((await prisma.gardenTask.count()) === 0) {
    await prisma.gardenTask.createMany({ data: GARDEN_TASKS.map((t, i) => ({ ...t, sort: i % 3 })) });
  }
  if ((await prisma.reward.count()) === 0) {
    const tiers = await prisma.tier.findMany();
    for (const { tierKey, ...r } of REWARDS as (typeof REWARDS[number] & { tierKey?: string })[]) {
      await prisma.reward.create({ data: { ...r, requiredTierId: tierKey ? tiers.find((t) => t.key === tierKey)?.id : null } });
    }
  }
  if ((await prisma.campaign.count()) === 0) {
    const y = now.getUTCFullYear();
    await prisma.campaign.createMany({
      data: [
        {
          name: "Jesienne sadzenie — podwójne punkty",
          description: "Podwójne punkty za rośliny, cebulki i nasiona. Posadź teraz, ciesz się wiosną!",
          type: "POINTS_MULTIPLIER",
          multiplierBp: 20000,
          categories: ["rosliny", "nasiona"],
          interestKeys: ["kwiaty", "drzewa-owocowe"],
          startsAt: new Date(Date.UTC(y, 8, 15)),
          endsAt: new Date(Date.UTC(y, 10, 15)),
          imageEmoji: "🌷",
          ctaLabel: "Zobacz porady",
        },
        {
          name: "+50 pkt za zakupy od 150 zł",
          description: "Zrób zakupy za min. 150 zł i odbierz 50 punktów bonusowych.",
          type: "BONUS_POINTS",
          bonusPoints: 50,
          minBasketGrosze: 15000,
          startsAt: new Date(Date.UTC(y, 9, 1)),
          endsAt: new Date(Date.UTC(y, 10, 1)),
          imageEmoji: "🎯",
        },
        {
          name: "Przygotuj ogród do zimy",
          description: "Agrowłóknina, kora i nawozy jesienne w sezonowej ofercie sklepu. Sprawdź listę prac w kalendarzu.",
          type: "SEASONAL_OFFER",
          interestKeys: ["trawnik", "balkon", "eko"],
          startsAt: new Date(Date.UTC(y, 9, 1)),
          endsAt: new Date(Date.UTC(y, 10, 30)),
          imageEmoji: "🍂",
          ctaLabel: "Kalendarz prac",
        },
        {
          name: "Wiosenny start",
          description: "Kampania archiwalna: x1,5 punktu za nawozy i podłoża.",
          type: "POINTS_MULTIPLIER",
          multiplierBp: 15000,
          categories: ["nawozy", "podloza"],
          startsAt: new Date(Date.UTC(y, 2, 1)),
          endsAt: new Date(Date.UTC(y, 3, 30)),
          imageEmoji: "🌼",
          active: false,
        },
      ],
    });
  }
}

async function createCustomer(email: string, firstName: string, lastName: string, createdAt: Date, opts: { marketing: boolean; interests: string[] }) {
  const passwordHash = await hashPassword("Ogrodnik2026");
  const tiers = await prisma.tier.findMany({ orderBy: { minPoints: "asc" } });
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      kind: "CUSTOMER",
      createdAt,
      passwordChangedAt: createdAt,
      profile: { create: { firstName, lastName } },
      commPrefs: { create: {} },
      card: { create: { number: generateCardNumber(), tierId: tiers[0]!.id, issuedAt: createdAt } },
      interests: { create: opts.interests.map((k) => ({ interestKey: k })) },
    },
    include: { card: true },
  });
  const consent = (type: "TERMS" | "PRIVACY_ACK" | "MARKETING_EMAIL" | "MARKETING_PUSH" | "MARKETING_SMS" | "PERSONALIZATION", granted: boolean) => ({
    userId: user.id,
    type,
    granted,
    documentVersion: DOCUMENT_VERSIONS.terms,
    source: "registration",
    createdAt,
  });
  await prisma.consentRecord.createMany({
    data: [
      consent("TERMS", true),
      consent("PRIVACY_ACK", true),
      consent("MARKETING_EMAIL", opts.marketing),
      consent("MARKETING_SMS", false),
      consent("MARKETING_PUSH", opts.marketing),
      consent("PERSONALIZATION", opts.marketing),
    ],
  });
  return user;
}

function basket() {
  const lines = between(1, 5);
  const items = [];
  const used = new Set<string>();
  for (let i = 0; i < lines; i++) {
    const p = pick(PRODUCTS);
    if (used.has(p.sku)) continue;
    used.add(p.sku);
    const quantity = p.category === "nasiona" ? between(1, 4) : between(1, 2);
    items.push({ sku: p.sku, name: p.name, category: p.category, quantity, unitPriceGrosze: p.priceGrosze, discountGrosze: 0 });
  }
  return items;
}

async function seedDemo(now: Date) {
  if (await prisma.user.findUnique({ where: { email: "admin@zielonyzakatek.example" } })) {
    console.log("• Dane demonstracyjne już istnieją — pomijam.");
    return;
  }
  const roles = await prisma.role.findMany();
  const staff = [
    { email: "admin@zielonyzakatek.example", firstName: "Alicja", lastName: "Administratorska", role: "ADMIN", password: "AdminDemo2026" },
    { email: "kierownik@zielonyzakatek.example", firstName: "Karol", lastName: "Kierownik", role: "MANAGER", password: "KierownikDemo2026" },
    { email: "obsluga@zielonyzakatek.example", firstName: "Olga", lastName: "Obsługa", role: "STAFF", password: "ObslugaDemo2026" },
  ];
  for (const s of staff) {
    await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: await hashPassword(s.password),
        kind: "STAFF",
        profile: { create: { firstName: s.firstName, lastName: s.lastName } },
        roles: { create: [{ roleId: roles.find((r) => r.key === s.role)!.id }] },
      },
    });
  }

  // Integracja symulatora kasy (format DEMO, podpisy HMAC). Sekret zapisywany lokalnie dla scripts/pos-simulator.ts.
  const { integration, secret } = await createIntegration("Symulator kasy (DEMO)", "DEMO");
  const credFile = process.env.POS_CREDENTIALS_FILE ?? ".pos-demo-credentials.json";
  writeFileSync(credFile, JSON.stringify({ keyId: integration.keyId, secret }, null, 2));
  const internal = await getInternalIntegration();

  const customers = [];
  const anna = await createCustomer("anna.demo@example.com", "Anna", "Zielińska", new Date(now.getTime() - 200 * DAY), {
    marketing: true,
    interests: ["kwiaty", "warzywnik", "balkon"],
  });
  customers.push(anna);
  for (let i = 0; i < 34; i++) {
    const first = DEMO_FIRST_NAMES[i % DEMO_FIRST_NAMES.length]!;
    const last = DEMO_LAST_NAMES[(i * 7) % DEMO_LAST_NAMES.length]!;
    const created = new Date(now.getTime() - between(1, 180) * DAY);
    const c = await createCustomer(`klient${String(i + 1).padStart(2, "0")}@example.com`, first, last, created, {
      marketing: rand() > 0.45,
      interests: INTERESTS.filter(() => rand() > 0.7).map((x) => x.key),
    });
    customers.push(c);
  }

  let receipt = 1000;
  for (const c of customers) {
    const isAnna = c.id === anna.id;
    const count = isAnna ? 12 : between(0, 9);
    const registered = c.createdAt.getTime();
    const dates = Array.from({ length: count }, () => new Date(registered + rand() * (now.getTime() - registered - DAY))).sort((a, b) => +a - +b);
    for (let i = 0; i < count; i++) {
      const at = dates[i]!;
      const items = basket();
      if (isAnna && i < 3) items.push({ sku: "ROS-002", name: "Hortensja bukietowa 'Vanille Fraise', 3 l", category: "rosliny", quantity: 2, unitPriceGrosze: 5999, discountGrosze: 0 });
      const total = items.reduce((s, it) => s + it.quantity * it.unitPriceGrosze, 0);
      await recordSale({
        integrationId: integration.id,
        externalId: `PAR-${receipt++}`,
        cardId: c.card!.id,
        storeCode: "ZZ-01",
        occurredAt: at,
        items,
        totalGrosze: total,
        allowBackdate: true,
      });
    }
  }
  // Przeliczenie poziomów w transakcji (recomputeTier wymaga klienta transakcyjnego).
  for (const c of customers) await prisma.$transaction((tx) => recomputeTier(tx, c.card!.id));

  // Anna: zwrot części pierwszego paragonu, wymiany nagród i wykorzystany kupon.
  const annaFirst = await prisma.transaction.findFirst({ where: { cardId: anna.card!.id, type: "SALE" }, orderBy: { occurredAt: "desc" }, include: { items: true } });
  if (annaFirst) {
    await recordReturn({
      integrationId: integration.id,
      externalId: `ZWR-${annaFirst.externalId}`,
      originalExternalId: annaFirst.externalId,
      items: [{ sku: (annaFirst.items.find((i) => i.qualifying) ?? annaFirst.items[0]!).sku, quantity: 1 }],
      occurredAt: new Date(Math.min(now.getTime() - 3600_000, annaFirst.occurredAt.getTime() + 2 * DAY)),
      reason: "Roślina uszkodzona w transporcie",
    });
  }
  const rewards = await prisma.reward.findMany({ orderBy: { pointsCost: "asc" } });
  const r5 = rewards[0]!;
  const r15 = rewards[1]!;
  const used = await redeemReward({ userId: anna.id, rewardId: r5.id, idempotencyKey: "seed-anna-1" });
  await redeemCoupon({ integrationId: internal.id, externalTransactionId: "DEMO-SEED-1", code: used.coupon.code, cardId: anna.card!.id, basketGrosze: 4500 });
  await redeemReward({ userId: anna.id, rewardId: r15.id, idempotencyKey: "seed-anna-2" });
  await redeemReward({ userId: anna.id, rewardId: r5.id, idempotencyKey: "seed-anna-3", now: new Date(now.getTime() - 40 * DAY) });
  await expireCoupons(prisma, now);

  // Kilka wymian u innych klientów (do raportów).
  for (const c of customers.slice(1, 12)) {
    const card = await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } });
    if (card.pointsBalance >= r5.pointsCost) await redeemReward({ userId: c.id, rewardId: r5.id, idempotencyKey: `seed-${c.id}` });
  }

  await prisma.complaint.create({
    data: {
      userId: anna.id,
      cardId: anna.card!.id,
      subject: "Brak punktów za zakupy z 2 października",
      description: "Robiłam zakupy, ale kasjer chyba nie zeskanował karty. Mam paragon.",
    },
  });
  await prisma.notification.create({
    data: { userId: anna.id, category: "MARKETING", title: "🌷 Jesienne sadzenie — podwójne punkty", body: "Podwójne punkty za rośliny, cebulki i nasiona do 15 listopada.", link: "/" },
  });

  console.log("• Konta demonstracyjne (tylko do lokalnych testów!):");
  for (const s of staff) console.log(`    ${s.role.padEnd(8)} ${s.email} / ${s.password}`);
  console.log("    KLIENT   anna.demo@example.com / Ogrodnik2026 (oraz klient01..34@example.com, to samo hasło)");
  console.log(`• Integracja POS symulatora: keyId=${integration.keyId} (sekret zapisano w ${credFile})`);
}

async function main() {
  const now = new Date();
  await seedReference();
  await seedContent(now);
  console.log("• Dane referencyjne i treści: OK");
  if (process.env.DEMO_MODE === "true" || process.env.SEED_DEMO === "true") await seedDemo(now);
  else console.log("• DEMO_MODE != true — pomijam dane demonstracyjne. Utwórz administratora: npm run admin:create");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
