import { test, expect } from "@playwright/test";
import { ADMIN, ANNA, STAFF, login, staffPage } from "./helpers";

test("administrator tworzy nagrodę widoczną w katalogu klienta", async ({ page, browser }) => {
  await login(page, ADMIN);
  await page.goto("/admin/nagrody/nowa");
  const name = `Nawóz gratis ${Date.now() % 100000}`;
  await page.getByLabel("Nazwa").fill(name);
  await page.getByLabel("Opis dla klienta").fill("Nawóz do roślin balkonowych gratis.");
  await page.getByLabel("Wartość (zł)").fill("19,99");
  await page.getByLabel("Koszt (pkt)").fill("300");
  await page.getByRole("button", { name: "Zapisz nagrodę" }).click();
  await expect(page).toHaveURL(/\/admin\/nagrody$/);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();

  const customer = await browser.newContext();
  const cp = await customer.newPage();
  await login(cp, ANNA);
  await cp.goto("/nagrody");
  await expect(cp.getByRole("heading", { name })).toBeVisible();
});

test("pracownik obsługi nie ma dostępu do zarządzania nagrodami ani konfiguracji (UI i API)", async ({ page }) => {
  await login(page, STAFF);
  await expect(page.getByRole("link", { name: "Nagrody" })).toHaveCount(0);
  await page.goto("/admin/nagrody");
  await expect(page).toHaveURL(/brak-dostepu/);
  const api = await page.request.post("/api/v1/admin/rewards", {
    data: { name: "Hack", description: "Hack", type: "AMOUNT_OFF", pointsCost: 1, valueGrosze: 100 },
    headers: { origin: "http://localhost:3100" },
  });
  expect(api.status()).toBe(403);
  const cfg = await page.request.get("/api/v1/admin/config");
  expect(cfg.status()).toBe(403);
});

test("klient nie wejdzie do panelu administracyjnego", async ({ page }) => {
  await login(page, ANNA);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get("/api/v1/admin/dashboard")).status()).toBe(403);
});

test("kierownik koryguje punkty z obowiązkowym powodem, a operacja trafia do audytu", async ({ browser }) => {
  const page = await staffPage(browser, { email: "kierownik@zielonyzakatek.example", password: "KierownikDemo2026" });
  await page.goto("/admin/klienci?q=anna.demo");
  await page.getByRole("link", { name: "Anna Zielińska" }).click();
  const before = Number((await page.getByTestId("admin-balance").innerText()).replace(/\D/g, ""));
  await page.getByLabel("Liczba punktów").fill("25");
  await page.getByLabel("Powód korekty (obowiązkowy)").fill("Reklamacja: brak punktów za paragon z 2.10");
  await page.getByRole("button", { name: "Zapisz korektę" }).click();
  await expect(page.getByText("Korekta +25 pkt zapisana.")).toBeVisible();
  await expect(page.getByTestId("admin-balance")).toHaveText(`${(before + 25).toLocaleString("pl-PL")} pkt`);
  await page.goto("/admin/audyt?akcja=points.adjust");
  await expect(page.getByText("Reklamacja: brak punktów za paragon z 2.10")).toBeVisible();
});

test("raporty i pulpit ładują się z kontrolą spójności salda", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page.getByText("Kontrola spójności: saldo każdej karty jest równe sumie operacji")).toBeVisible();
  await page.goto("/admin/raporty");
  await expect(page.getByRole("heading", { name: "Raporty programu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Wykorzystanie nagród" })).toBeVisible();
});
