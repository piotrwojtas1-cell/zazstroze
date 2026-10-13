import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as forgot } from "@/app/api/v1/auth/forgot-password/route";
import { POST as reset } from "@/app/api/v1/auth/reset-password/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { GET as myCard } from "@/app/api/v1/me/card/route";
import { GET as myQr } from "@/app/api/v1/me/card/qr/route";
import { GET as myTransaction } from "@/app/api/v1/me/transactions/[id]/route";
import { PUT as setConsents } from "@/app/api/v1/me/consents/route";
import { GET as exportData } from "@/app/api/v1/me/export/route";
import { POST as deleteMe } from "@/app/api/v1/me/delete/route";
import { POST as redeem } from "@/app/api/v1/rewards/[id]/redeem/route";
import { GET as adminCustomers } from "@/app/api/v1/admin/customers/route";
import { POST as adjust } from "@/app/api/v1/admin/cards/[id]/adjust/route";
import { POST as createRewardApi } from "@/app/api/v1/admin/rewards/route";
import { PUT as updateConfig } from "@/app/api/v1/admin/config/route";
import { POST as posSale } from "@/app/api/v1/admin/pos/sale/route";
import { recordSale } from "@/server/loyalty/transactions";
import { getInternalIntegration } from "@/server/pos/integrations";
import { currentConsents } from "@/server/services/consents";
import { call, tokenFor } from "../helpers/http";
import { createCustomer, createReward, createStaff, item, resetDb } from "../helpers/db";

beforeEach(resetDb);

const validRegistration = {
  email: "nowa.klientka@example.com",
  password: "ZielonyOgrod2026",
  firstName: "Zofia",
  acceptTerms: true,
  acknowledgePrivacy: true,
  interests: ["warzywnik"],
};

const cookieToken = (headers: Headers) => headers.get("set-cookie")?.match(/zz_session=([^;]+)/)?.[1];

describe("rejestracja i logowanie", () => {
  it("rejestracja tworzy konto, kartę, zgody (marketingowe domyślnie odrzucone) i sesję", async () => {
    const res = await call(register, { body: validRegistration });
    expect(res.status).toBe(201);
    const token = cookieToken(res.headers)!;
    expect(token).toBeTruthy();
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    const card = await call(myCard, { token });
    expect(card.status).toBe(200);
    expect(card.json.number).toMatch(/^2900\d{12}$/);
    expect(card.json.pointsBalance).toBe(0);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: validRegistration.email } });
    expect(user.passwordHash).not.toContain(validRegistration.password);
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);
    const consents = await currentConsents(prisma, user.id);
    expect(consents).toMatchObject({ TERMS: true, PRIVACY_ACK: true, MARKETING_EMAIL: false, MARKETING_SMS: false, MARKETING_PUSH: false, PERSONALIZATION: false });
    const qr = await call(myQr, { token });
    expect(qr.json.payload).toMatch(/^ZZ1\./);
    expect(qr.json.svg).toContain("<svg");
  });

  it("wymaga akceptacji regulaminu i silnego hasła; nie pozwala na duplikat konta", async () => {
    expect((await call(register, { body: { ...validRegistration, acceptTerms: false } })).status).toBe(422);
    const weak = await call(register, { body: { ...validRegistration, password: "krotkie" } });
    expect(weak.status).toBe(422);
    expect(weak.json.error.code).toBe("VALIDATION_ERROR");
    await call(register, { body: validRegistration });
    const dup = await call(register, { body: validRegistration });
    expect(dup.status).toBe(409);
  });

  it("logowanie: błędne hasło → 401 z ogólnym komunikatem; poprawne → sesja; wylogowanie unieważnia sesję", async () => {
    await createCustomer({ email: "anna@example.com", password: "PoprawneHaslo1" });
    const bad = await call(login, { body: { email: "anna@example.com", password: "zle-haslo" } });
    expect(bad.status).toBe(401);
    expect(bad.json.error.message).toBe("Nieprawidłowy e-mail lub hasło.");
    const unknown = await call(login, { body: { email: "nie-ma@example.com", password: "cokolwiek" } });
    expect(unknown.json.error.message).toBe(bad.json.error.message);
    const ok = await call(login, { body: { email: "ANNA@example.com", password: "PoprawneHaslo1" } });
    expect(ok.status).toBe(200);
    const token = cookieToken(ok.headers)!;
    expect((await call(me, { token })).status).toBe(200);
    await call(logout, { method: "POST", token });
    expect((await call(me, { token })).status).toBe(401);
  });

  it("blokuje konto po 5 nieudanych próbach (ochrona brute force)", async () => {
    await createCustomer({ email: "brute@example.com", password: "PoprawneHaslo1" });
    for (let i = 0; i < 5; i++) await call(login, { body: { email: "brute@example.com", password: `zle${i}` } });
    const locked = await call(login, { body: { email: "brute@example.com", password: "PoprawneHaslo1" } });
    expect(locked.status).toBe(423);
    expect(locked.json.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("odzyskiwanie hasła: link jednorazowy, unieważnia stare sesje", async () => {
    const c = await createCustomer({ email: "reset@example.com", password: "StareHaslo123" });
    const oldToken = await tokenFor(c);
    const r = await call(forgot, { body: { email: "reset@example.com" } });
    expect(r.status).toBe(200);
    const silent = await call(forgot, { body: { email: "nieistniejacy@example.com" } });
    expect(silent.json.message).toBe(r.json.message);
    const mail = await prisma.emailOutbox.findFirstOrThrow({ where: { to: "reset@example.com" } });
    const token = decodeURIComponent(mail.body.match(/token=([^\s]+)/)![1]!);
    const done = await call(reset, { body: { token, password: "NoweHaslo2026" } });
    expect(done.status).toBe(200);
    expect((await call(reset, { body: { token, password: "InneHaslo2026" } })).status).toBe(400);
    expect((await call(me, { token: oldToken })).status).toBe(401);
    expect((await call(login, { body: { email: "reset@example.com", password: "NoweHaslo2026" } })).status).toBe(200);
  });
});

describe("autoryzacja i izolacja danych", () => {
  it("brak sesji → 401, klient w panelu admina → 403", async () => {
    expect((await call(myCard)).status).toBe(401);
    const c = await createCustomer();
    const token = await tokenFor(c);
    const r = await call(adminCustomers, { token });
    expect(r.status).toBe(403);
    expect(r.json.error.code).toBe("FORBIDDEN");
  });

  it("klient nie widzi transakcji innego klienta", async () => {
    const owner = await createCustomer();
    const intruder = await createCustomer();
    const { id: integrationId } = await getInternalIntegration();
    const items = [item("A", "rosliny", 1, 1000)];
    const { transaction } = await recordSale({ integrationId, externalId: "P-ISO", cardId: owner.card!.id, occurredAt: new Date(), items, totalGrosze: 1000 });
    expect((await call(myTransaction, { token: await tokenFor(owner), params: { id: transaction.id } })).status).toBe(200);
    expect((await call(myTransaction, { token: await tokenFor(intruder), params: { id: transaction.id } })).status).toBe(404);
  });

  it("klient nie może przyznać sobie punktów — brak endpointu, a endpointy kasy wymagają uprawnienia pracownika", async () => {
    const c = await createCustomer();
    const token = await tokenFor(c);
    const r = await call(posSale, { token, body: { externalId: "HACK-1", cardCode: c.card!.number, occurredAt: new Date().toISOString(), totalGrosze: 100000, items: [item("A", "rosliny", 1, 100000)] } });
    expect(r.status).toBe(403);
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(0);
  });

  it("role: obsługa nie koryguje punktów, kierownik tak (do limitu), administrator powyżej limitu", async () => {
    const c = await createCustomer();
    const staff = await tokenFor(await createStaff("STAFF"));
    const manager = await tokenFor(await createStaff("MANAGER"));
    const admin = await tokenFor(await createStaff("ADMIN"));
    const body = { points: 50, reason: "Reklamacja — brak naliczenia za paragon" };
    const headers = { "idempotency-key": "adj-12345678" };
    expect((await call(adjust, { token: staff, body, headers, params: { id: c.card!.id } })).status).toBe(403);
    const ok = await call(adjust, { token: manager, body, headers, params: { id: c.card!.id } });
    expect(ok.status).toBe(200);
    // Ten sam klucz idempotencji → bez ponownego naliczenia.
    await call(adjust, { token: manager, body, headers, params: { id: c.card!.id } });
    expect((await prisma.loyaltyCard.findUniqueOrThrow({ where: { id: c.card!.id } })).pointsBalance).toBe(50);
    const big = { points: 1000, reason: "Duża korekta po migracji danych" };
    expect((await call(adjust, { token: manager, body: big, headers: { "idempotency-key": "adj-big-0001" }, params: { id: c.card!.id } })).status).toBe(403);
    expect((await call(adjust, { token: admin, body: big, headers: { "idempotency-key": "adj-big-0002" }, params: { id: c.card!.id } })).status).toBe(200);
    expect((await call(adjust, { token: admin, body: { points: 5, reason: "krótko" }, headers: { "idempotency-key": "adj-short-01" }, params: { id: c.card!.id } })).status).toBe(422);
    const audit = await prisma.auditLog.count({ where: { action: "points.adjust", entityId: c.card!.id } });
    expect(audit).toBe(2);
  });

  it("kierownik zarządza nagrodami, ale nie konfiguracją programu; obsługa nie zarządza nagrodami", async () => {
    const manager = await tokenFor(await createStaff("MANAGER"));
    const staff = await tokenFor(await createStaff("STAFF"));
    const reward = { name: "Nowa nagroda", description: "Opis nagrody", type: "AMOUNT_OFF", pointsCost: 200, valueGrosze: 1000, minBasketGrosze: 0, validDays: 30 };
    expect((await call(createRewardApi, { token: staff, body: reward })).status).toBe(403);
    expect((await call(createRewardApi, { token: manager, body: reward })).status).toBe(200);
    const cfg = { earnRateBp: 20000, rounding: "FLOOR", minQualifyingGrosze: 0, excludedCategories: [], tierWindowDays: 365, maxManualAdjustment: 500, allowNegativeBalance: true, couponDefaultValidDays: 30, pointValueGroszeInfo: 5, note: "Próba zmiany" };
    expect((await call(updateConfig, { method: "PUT", token: manager, body: cfg })).status).toBe(403);
  });

  it("ochrona CSRF: żądanie modyfikujące z obcego originu jest odrzucane", async () => {
    const c = await createCustomer();
    const token = await tokenFor(c);
    const reward = await createReward();
    const r = await call(redeem, { token, params: { id: reward.id }, origin: "https://evil.example", method: "POST", headers: { "idempotency-key": "csrf-test-01" } });
    expect(r.status).toBe(403);
    const noOrigin = await call(redeem, { token, params: { id: reward.id }, origin: null, method: "POST", headers: { "idempotency-key": "csrf-test-02" } });
    expect(noOrigin.status).toBe(403);
  });

  it("wymiana punktów bez nagłówka Idempotency-Key → 400", async () => {
    const c = await createCustomer();
    const reward = await createReward();
    const r = await call(redeem, { token: await tokenFor(c), params: { id: reward.id }, method: "POST" });
    expect(r.status).toBe(400);
  });

  it("nieprawidłowy JSON i nieznane pola są obsługiwane przewidywalnie", async () => {
    const res = await call(login, { body: { email: "to-nie-email", password: "" } });
    expect(res.status).toBe(422);
    expect(Array.isArray(res.json.error.details)).toBe(true);
  });
});

describe("prywatność", () => {
  it("wycofanie zgody zapisuje nowy wpis historii; eksport nie zawiera hasła; usunięcie anonimizuje konto", async () => {
    const c = await createCustomer({ email: "rodo@example.com", password: "HasloRodo2026" });
    const token = await tokenFor(c);
    await call(setConsents, { method: "PUT", token, body: { marketingEmail: true, marketingSms: false, marketingPush: false, personalization: false } });
    await call(setConsents, { method: "PUT", token, body: { marketingEmail: false, marketingSms: false, marketingPush: false, personalization: false } });
    const history = await prisma.consentRecord.findMany({ where: { userId: c.id, type: "MARKETING_EMAIL" } });
    expect(history.map((h) => h.granted)).toEqual([true, false]);

    const exp = await call(exportData, { token });
    expect(exp.status).toBe(200);
    expect(JSON.stringify(exp.json)).not.toContain("passwordHash");
    expect(exp.json.account.email).toBe("rodo@example.com");

    expect((await call(deleteMe, { token, body: { password: "zle", confirm: "USUŃ" } })).status).toBe(401);
    expect((await call(deleteMe, { token, body: { password: "HasloRodo2026", confirm: "USUŃ" } })).status).toBe(200);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: c.id }, include: { profile: true, card: true } });
    expect(after.status).toBe("DELETED");
    expect(after.email).not.toContain("rodo@");
    expect(after.profile?.lastName).toBeNull();
    expect(after.card?.status).toBe("CLOSED");
    expect((await call(me, { token })).status).toBe(401);
  });
});
