import { describe, expect, it } from "vitest";
import { calculateDiscount, calculateEarn, pointsForAmount, returnReversal, returnedValue, type EarnCampaign } from "@/server/loyalty/calculator";

const config = { earnRateBp: 10000, rounding: "FLOOR" as const, minQualifyingGrosze: 100, excludedCategories: ["karty-podarunkowe", "kaucje"] };
const campaign = (o: Partial<EarnCampaign>): EarnCampaign => ({ id: "c", name: "Kampania", type: "POINTS_MULTIPLIER", multiplierBp: 20000, bonusPoints: null, minBasketGrosze: 0, categories: [], tierKeys: [], ...o });

describe("pointsForAmount — przelicznik i zaokrąglenia", () => {
  it("1 pkt za 1 zł, zaokrąglenie w dół", () => {
    expect(pointsForAmount(12345, 10000, "FLOOR")).toBe(123);
    expect(pointsForAmount(99, 10000, "FLOOR")).toBe(0);
  });
  it("zaokrąglenie matematyczne", () => {
    expect(pointsForAmount(12350, 10000, "HALF_UP")).toBe(124);
    expect(pointsForAmount(12349, 10000, "HALF_UP")).toBe(123);
  });
  it("przelicznik ułamkowy (1 pkt za 2 zł)", () => {
    expect(pointsForAmount(1999, 5000, "FLOOR")).toBe(9);
  });
  it("brak błędów zmiennoprzecinkowych dla dużych kwot", () => {
    expect(pointsForAmount(99_999_999, 10000, "FLOOR")).toBe(999_999);
  });
});

describe("calculateEarn", () => {
  it("pomija kategorie wykluczone", () => {
    const r = calculateEarn({ items: [{ category: "rosliny", totalGrosze: 5000 }, { category: "karty-podarunkowe", totalGrosze: 10000 }], config, tier: null, campaigns: [] });
    expect(r.qualifyingGrosze).toBe(5000);
    expect(r.excludedGrosze).toBe(10000);
    expect(r.total).toBe(50);
  });
  it("brak punktów poniżej minimalnej kwoty", () => {
    const r = calculateEarn({ items: [{ category: "rosliny", totalGrosze: 99 }], config, tier: null, campaigns: [] });
    expect(r.total).toBe(0);
    expect(r.belowMinimum).toBe(true);
  });
  it("bonus poziomu liczony od punktów podstawowych", () => {
    const r = calculateEarn({ items: [{ category: "rosliny", totalGrosze: 10000 }], config, tier: { key: "KRZEW", name: "Krzew", multiplierBp: 11000 }, campaigns: [] });
    expect(r.basePoints).toBe(100);
    expect(r.tierBonus).toBe(10);
    expect(r.total).toBe(110);
  });
  it("kampanie się nie sumują — wybierany jest najlepszy mnożnik i najwyższy bonus", () => {
    const r = calculateEarn({
      items: [{ category: "rosliny", totalGrosze: 10000 }, { category: "narzedzia", totalGrosze: 5000 }],
      config,
      tier: null,
      campaigns: [
        campaign({ id: "a", multiplierBp: 20000, categories: ["rosliny"] }), // +100
        campaign({ id: "b", multiplierBp: 15000, categories: [] }), // +75
        campaign({ id: "c", type: "BONUS_POINTS", multiplierBp: null, bonusPoints: 30 }),
        campaign({ id: "d", type: "BONUS_POINTS", multiplierBp: null, bonusPoints: 50, minBasketGrosze: 20000 }), // nie spełnia progu
      ],
    });
    expect(r.basePoints).toBe(150);
    expect(r.campaignMultiplier?.campaignId).toBe("a");
    expect(r.campaignMultiplier?.points).toBe(100);
    expect(r.campaignBonus?.points).toBe(30);
    expect(r.total).toBe(280);
  });
  it("kampania ograniczona do poziomu nie obejmuje innych poziomów", () => {
    const r = calculateEarn({ items: [{ category: "rosliny", totalGrosze: 10000 }], config, tier: { key: "SADZONKA", name: "Sadzonka", multiplierBp: 10000 }, campaigns: [campaign({ tierKeys: ["DAB"] })] });
    expect(r.campaignMultiplier).toBeNull();
  });
});

describe("returnReversal — kumulatywna korekta po zwrotach", () => {
  it("suma korekt częściowych równa się punktom naliczonym", () => {
    const awarded = 101;
    const original = 10000;
    let reversed = 0;
    for (const cumulative of [3333, 6666, 10000]) {
      reversed += returnReversal({ pointsAwarded: awarded, originalQualifyingGrosze: original, cumulativeReturnedQualifyingGrosze: cumulative, alreadyReversed: reversed });
    }
    expect(reversed).toBe(awarded);
  });
  it("brak korekty, gdy nic nie naliczono", () => {
    expect(returnReversal({ pointsAwarded: 0, originalQualifyingGrosze: 1000, cumulativeReturnedQualifyingGrosze: 1000, alreadyReversed: 0 })).toBe(0);
  });
  it("wartość zwracanej części pozycji", () => {
    expect(returnedValue(1000, 3, 1)).toBe(333);
    expect(returnedValue(1000, 3, 3)).toBe(1000);
  });
});

describe("calculateDiscount", () => {
  const rule = { type: "AMOUNT_OFF" as const, valueGrosze: 1500, percentBp: null, minBasketGrosze: 6000, maxDiscountGrosze: null, excludedCategories: ["karty-podarunkowe"] };
  it("odrzuca zbyt mały koszyk (po odliczeniu kategorii wykluczonych)", () => {
    const r = calculateDiscount(rule, 9000, [{ category: "rosliny", totalGrosze: 4000 }, { category: "karty-podarunkowe", totalGrosze: 5000 }]);
    expect(r.ok).toBe(false);
  });
  it("rabat kwotowy", () => {
    expect(calculateDiscount(rule, 6000)).toEqual({ ok: true, discountGrosze: 1500, eligibleGrosze: 6000 });
  });
  it("rabat procentowy z limitem", () => {
    const r = calculateDiscount({ ...rule, type: "PERCENT_OFF", valueGrosze: null, percentBp: 1500, maxDiscountGrosze: 4000, minBasketGrosze: 0 }, 50000);
    expect(r).toMatchObject({ ok: true, discountGrosze: 4000 });
  });
  it("rabat nigdy nie przekracza wartości koszyka", () => {
    const r = calculateDiscount({ ...rule, valueGrosze: 5000, minBasketGrosze: 0 }, 3000);
    expect(r).toMatchObject({ ok: true, discountGrosze: 3000 });
  });
});
