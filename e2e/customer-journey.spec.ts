import { test, expect } from "@playwright/test";
import { balanceOn, staffPage } from "./helpers";

/**
 * Pełny pionowy wycinek: rejestracja → karta → zakup w kasie demo → punkty → nagroda → kupon w kasie
 * (bez możliwości ponownego użycia) → zwrot z korektą punktów.
 */
test.describe.configure({ mode: "serial" });

test("ścieżka klienta od rejestracji do zwrotu", async ({ page, browser }) => {
  const email = `e2e.${Date.now()}@example.com`;

  // 1. Rejestracja i karta
  await page.goto("/rejestracja");
  await page.getByLabel("Imię").fill("Marta");
  await page.getByLabel("Adres e-mail").fill(email);
  await page.getByLabel("Hasło").fill("ZielonyOgrod2026");
  await expect(page.getByLabel("Chcę otrzymywać oferty i nowości e-mailem")).not.toBeChecked();
  await page.getByLabel(/Akceptuję/).check();
  await page.getByLabel(/Zapoznałem/).check();
  await page.getByRole("button", { name: "Załóż kartę" }).click();
  await expect(page).toHaveURL(/\/karta/);
  await expect(page.getByText("Witaj w programie, Marta!")).toBeVisible();
  const qr = page.getByTestId("card-qr");
  await expect(qr.locator("svg")).toBeVisible();
  const payload = await qr.getAttribute("data-payload");
  expect(payload).toMatch(/^ZZ1\.\d{16}\./);
  const cardNumber = payload!.split(".")[1]!;

  // 2. Kasa demo: identyfikacja kodem QR i sprzedaż
  const staff = await staffPage(browser);
  await staff.goto("/admin/kasa");
  await staff.getByLabel("Kod QR lub numer karty").fill(payload!);
  await staff.getByRole("button", { name: "Szukaj" }).click();
  await expect(staff.getByTestId("pos-customer")).toContainText("Marta");
  await staff.getByTestId("pos-product-ROS-002").click();
  await staff.getByTestId("pos-product-ROS-002").click();
  await staff.getByTestId("pos-product-POD-001").click();
  await expect(staff.getByTestId("pos-total")).toContainText("144,97");
  await staff.getByRole("button", { name: /Zakończ sprzedaż/ }).click();
  // 144 pkt podstawowe + 119 z kampanii „podwójne punkty” na rośliny (dane demo)
  await expect(staff.getByTestId("pos-points")).toHaveText("+263 pkt");

  // 3. Klient widzi saldo i historię
  expect(await balanceOn(page)).toBe(263);
  await page.goto("/historia");
  await expect(page.getByTestId("ledger-list")).toContainText("Zakupy 144,97");
  await expect(page.getByTestId("ledger-list")).toContainText("Bonus kampanii");

  // 4. Wymiana punktów na nagrodę
  await page.goto("/nagrody");
  const card = page.locator("li", { has: page.getByRole("heading", { name: "Rabat 5 zł" }) });
  await card.getByRole("button", { name: "Odbierz" }).click();
  await page.getByRole("button", { name: /Wymień 100 pkt/ }).click();
  const couponCode = (await page.getByTestId("new-coupon-code").innerText()).trim();
  expect(couponCode).toMatch(/^ZZ-/);
  expect(await balanceOn(page)).toBe(163);

  // 5. Kupon w kasie — działa raz
  await staff.getByRole("button", { name: "Następny klient" }).click();
  await staff.getByLabel("Kod QR lub numer karty").fill(cardNumber);
  await staff.getByRole("button", { name: "Szukaj" }).click();
  await expect(staff.getByTestId("pos-customer")).toContainText("numer wpisany ręcznie");
  await staff.getByTestId("pos-product-ROS-001").click();
  await staff.getByTestId("pos-product-POD-001").click();
  await staff.getByRole("button", { name: "Zastosuj" }).first().click();
  await expect(staff.getByTestId("pos-coupon-applied")).toContainText(couponCode);
  await expect(staff.getByTestId("pos-total")).toContainText("38,98");
  await staff.getByRole("button", { name: /Zakończ sprzedaż/ }).click();
  await expect(staff.getByTestId("pos-result")).toBeVisible();
  await staff.getByRole("button", { name: "Następny klient" }).click();
  await staff.getByLabel("Kod QR lub numer karty").fill(cardNumber);
  await staff.getByRole("button", { name: "Szukaj" }).click();
  await staff.getByTestId("pos-product-ROS-001").click();
  await staff.getByLabel("Kod kuponu").fill(couponCode);
  await staff.getByRole("button", { name: "OK" }).click();
  await expect(staff.getByText("Kupon został już wykorzystany.")).toBeVisible();
  await page.goto("/kupony");
  await page.getByRole("tab", { name: /Wykorzystane/ }).click();
  await expect(page.getByText(couponCode)).toBeVisible();

  // 6. Zwrot jednej hortensji z pierwszego paragonu → korekta punktów
  const before = await balanceOn(page);
  await staff.goto("/admin/kasa");
  await staff.getByRole("link", { name: /^DEMO-/ }).last().click();
  await expect(staff.getByRole("heading", { name: /Sprzedaż DEMO-/ })).toBeVisible();
  await staff.getByLabel(/Ilość do zwrotu: Hortensja/).fill("1");
  await staff.getByRole("button", { name: "Zarejestruj zwrot" }).click();
  await expect(staff.getByText(/Zwrot zarejestrowany. Odjęto 109 pkt/)).toBeVisible();
  expect(await balanceOn(page)).toBe(before - 109);
});
