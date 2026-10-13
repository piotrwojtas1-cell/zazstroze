import { describe, expect, it } from "vitest";
import { isValidLuhn, luhnCheckDigit, formatCardNumber } from "@/lib/luhn";
import { parsePLN, formatPLN, plural } from "@/lib/money";
import { allocateDiscount } from "@/lib/allocate";
import { passwordSchema } from "@/server/auth/password-policy";
import { generateCardNumber } from "@/server/services/auth";

describe("numer karty (Luhn)", () => {
  it("generuje poprawne 16-cyfrowe numery", () => {
    for (let i = 0; i < 50; i++) {
      const n = generateCardNumber();
      expect(n).toMatch(/^2900\d{12}$/);
      expect(isValidLuhn(n)).toBe(true);
    }
  });
  it("wykrywa literówkę", () => {
    const n = "290012345678901" + luhnCheckDigit("290012345678901");
    const typo = n.slice(0, 5) + ((Number(n[5]) + 1) % 10) + n.slice(6);
    expect(isValidLuhn(typo)).toBe(false);
    expect(formatCardNumber(n)).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
  });
});

describe("kwoty", () => {
  it("parsuje bez arytmetyki zmiennoprzecinkowej", () => {
    expect(parsePLN("12,5")).toBe(1250);
    expect(parsePLN("0.1")).toBe(10);
    expect(parsePLN("1999")).toBe(199900);
    expect(parsePLN("12,345")).toBeNull();
    expect(parsePLN("abc")).toBeNull();
  });
  it("formatuje w złotych", () => {
    expect(formatPLN(12345).replace(/\s/g, " ")).toBe("123,45 zł");
  });
  it("odmienia liczebniki", () => {
    expect(plural(1, "punkt", "punkty", "punktów")).toBe("punkt");
    expect(plural(3, "punkt", "punkty", "punktów")).toBe("punkty");
    expect(plural(12, "punkt", "punkty", "punktów")).toBe("punktów");
    expect(plural(22, "punkt", "punkty", "punktów")).toBe("punkty");
  });
});

describe("rozkład rabatu na pozycje", () => {
  it("suma części równa rabatowi, pozycje wykluczone bez rabatu", () => {
    const parts = allocateDiscount([1000, 2000, 3333], [true, true, false], 1001);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1001);
    expect(parts[2]).toBe(0);
  });
  it("nie przekracza wartości pozycji", () => {
    const parts = allocateDiscount([100, 100], [true, true], 500);
    expect(parts).toEqual([100, 100]);
  });
});

describe("polityka haseł", () => {
  it("odrzuca słabe hasła", () => {
    expect(passwordSchema.safeParse("krotkie1").success).toBe(false);
    expect(passwordSchema.safeParse("tylkolitery").success).toBe(false);
    expect(passwordSchema.safeParse("1234567890").success).toBe(false);
  });
  it("akceptuje silne hasło", () => {
    expect(passwordSchema.safeParse("ZielonyOgrod2026").success).toBe(true);
  });
});

import { rewardSchema } from "@/server/services/admin-schemas";
describe("schemat nagrody", () => {
  it("puste daty dostępności nie są zamieniane na 1970-01-01 (regresja)", () => {
    const r = rewardSchema.safeParse({ name: "Nagroda", description: "Opis", type: "AMOUNT_OFF", pointsCost: 10, valueGrosze: 100, startsAt: null, endsAt: null });
    expect(r.success).toBe(true);
    expect(r.success && r.data.startsAt).toBeNull();
    expect(rewardSchema.safeParse({ name: "Nagroda", description: "Opis", type: "AMOUNT_OFF", pointsCost: 10, valueGrosze: 100, startsAt: "", endsAt: "2026-12-01" }).success).toBe(true);
  });
});
