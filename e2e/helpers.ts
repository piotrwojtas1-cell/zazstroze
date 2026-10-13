import { expect, type Page, type Browser } from "@playwright/test";

export const STAFF = { email: "obsluga@zielonyzakatek.example", password: "ObslugaDemo2026" };
export const ADMIN = { email: "admin@zielonyzakatek.example", password: "AdminDemo2026" };
export const ANNA = { email: "anna.demo@example.com", password: "Ogrodnik2026" };

export async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/logowanie");
  await page.getByLabel("Adres e-mail").fill(who.email);
  await page.getByLabel("Hasło").fill(who.password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
  await expect(page).not.toHaveURL(/logowanie/);
}

export async function staffPage(browser: Browser, who = STAFF) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "pl-PL" });
  const page = await ctx.newPage();
  await login(page, who);
  await expect(page).toHaveURL(/\/admin/);
  return page;
}

export async function balanceOn(page: Page) {
  await page.goto("/");
  const text = await page.getByTestId("points-balance").innerText();
  return Number(text.replace(/\D/g, ""));
}
