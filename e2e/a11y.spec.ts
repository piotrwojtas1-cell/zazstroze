import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ANNA, login } from "./helpers";

const PUBLIC = ["/witaj", "/logowanie", "/rejestracja", "/odzyskaj-haslo", "/regulamin"];
const CUSTOMER = ["/", "/karta", "/nagrody", "/kupony", "/porady", "/porady/kalendarz", "/historia", "/profil", "/profil/prywatnosc", "/lista-zakupow", "/powiadomienia", "/pomoc"];

async function audit(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${path}: ${v.id} — ${v.help} (${v.nodes.length})`)).toEqual([]);
  // Responsywność: brak poziomego przewijania strony.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${path}: poziome przewijanie`).toBeLessThanOrEqual(1);
}

test("strony publiczne: dostępność (axe, WCAG 2.1 AA) i brak poziomego przewijania", async ({ page }) => {
  for (const p of PUBLIC) await audit(page, p);
});

test("aplikacja klienta: dostępność i responsywność", async ({ page }) => {
  await login(page, ANNA);
  for (const p of CUSTOMER) await audit(page, p);
});
