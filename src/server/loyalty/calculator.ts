/**
 * Czyste (bez I/O) funkcje kalkulacji punktów. Wszystkie obliczenia na liczbach całkowitych / BigInt.
 *
 * Zasady (konfigurowalne w ProgramConfig, wartości domyślne wyłącznie demonstracyjne):
 *  1. Podstawa naliczenia = suma wartości pozycji PO rabatach, z pominięciem kategorii wykluczonych.
 *  2. Punkty bazowe = podstawa × przelicznik (earnRateBp / 10000 pkt za 1 zł), zaokrąglenie wg konfiguracji
 *     (domyślnie w dół — klient nigdy nie dostaje „ułamka punktu”).
 *  3. Jeżeli podstawa < minQualifyingGrosze — brak punktów.
 *  4. Bonus poziomu = floor(bazowe × (mnożnik poziomu − 1)).
 *  5. Kampanie nie sumują się: stosowany jest JEDEN najkorzystniejszy mnożnik kampanii
 *     (liczony od wartości pozycji z kategorii kampanii) oraz JEDEN najwyższy bonus kwotowy.
 *     Mnożnik kampanii nie jest mnożony przez mnożnik poziomu.
 */

export type Rounding = "FLOOR" | "HALF_UP";

export interface EarnConfig {
  earnRateBp: number;
  rounding: Rounding;
  minQualifyingGrosze: number;
  excludedCategories: string[];
}

export interface EarnItem {
  category: string;
  totalGrosze: number;
}

export interface EarnCampaign {
  id: string;
  name: string;
  type: "POINTS_MULTIPLIER" | "BONUS_POINTS" | "SEASONAL_OFFER";
  multiplierBp: number | null;
  bonusPoints: number | null;
  minBasketGrosze: number;
  categories: string[];
  tierKeys: string[];
}

export interface EarnTier {
  key: string;
  name: string;
  multiplierBp: number;
}

export interface EarnBreakdown {
  qualifyingGrosze: number;
  excludedGrosze: number;
  basePoints: number;
  tierBonus: number;
  campaignMultiplier: { campaignId: string; name: string; points: number } | null;
  campaignBonus: { campaignId: string; name: string; points: number } | null;
  total: number;
  belowMinimum: boolean;
  explanation: string[];
}

const DENOM = 1_000_000n; // 100 groszy × 10000 bp

function divide(numerator: bigint, denominator: bigint, rounding: Rounding): number {
  if (numerator <= 0n) return 0;
  const result = rounding === "FLOOR" ? numerator / denominator : (2n * numerator + denominator) / (2n * denominator);
  return Number(result);
}

/** Punkty za kwotę w groszach przy przeliczniku w bp (10000 = 1 pkt / 1 zł). */
export function pointsForAmount(grosze: number, earnRateBp: number, rounding: Rounding): number {
  return divide(BigInt(grosze) * BigInt(earnRateBp), DENOM, rounding);
}

export function isQualifying(category: string, excluded: string[]): boolean {
  return !excluded.includes(category);
}

export function calculateEarn(params: {
  items: EarnItem[];
  config: EarnConfig;
  tier: EarnTier | null;
  campaigns: EarnCampaign[];
}): EarnBreakdown {
  const { items, config, tier, campaigns } = params;
  const explanation: string[] = [];

  let qualifyingGrosze = 0;
  let excludedGrosze = 0;
  for (const item of items) {
    if (isQualifying(item.category, config.excludedCategories)) qualifyingGrosze += item.totalGrosze;
    else excludedGrosze += item.totalGrosze;
  }

  const empty: EarnBreakdown = {
    qualifyingGrosze,
    excludedGrosze,
    basePoints: 0,
    tierBonus: 0,
    campaignMultiplier: null,
    campaignBonus: null,
    total: 0,
    belowMinimum: false,
    explanation,
  };

  if (qualifyingGrosze <= 0) {
    explanation.push("Brak pozycji kwalifikujących się do naliczenia punktów.");
    return empty;
  }
  if (qualifyingGrosze < config.minQualifyingGrosze) {
    explanation.push("Wartość kwalifikujących się zakupów jest niższa od minimalnej wymaganej do naliczenia punktów.");
    return { ...empty, belowMinimum: true };
  }

  const basePoints = pointsForAmount(qualifyingGrosze, config.earnRateBp, config.rounding);
  explanation.push(`Punkty podstawowe: ${basePoints}.`);

  let tierBonus = 0;
  if (tier && tier.multiplierBp > 10_000) {
    tierBonus = Number((BigInt(basePoints) * BigInt(tier.multiplierBp - 10_000)) / 10_000n);
    if (tierBonus > 0) explanation.push(`Bonus poziomu ${tier.name}: +${tierBonus}.`);
  }

  const eligible = campaigns.filter(
    (c) =>
      qualifyingGrosze >= c.minBasketGrosze && (c.tierKeys.length === 0 || (tier !== null && c.tierKeys.includes(tier.key))),
  );

  let campaignMultiplier: EarnBreakdown["campaignMultiplier"] = null;
  for (const c of eligible) {
    if (c.type !== "POINTS_MULTIPLIER" || !c.multiplierBp || c.multiplierBp <= 10_000) continue;
    const eligibleGrosze = items
      .filter((i) => isQualifying(i.category, config.excludedCategories))
      .filter((i) => c.categories.length === 0 || c.categories.includes(i.category))
      .reduce((s, i) => s + i.totalGrosze, 0);
    // Dodatkowe punkty = kwota × przelicznik × (mnożnik − 1)
    const extra = divide(
      BigInt(eligibleGrosze) * BigInt(config.earnRateBp) * BigInt(c.multiplierBp - 10_000),
      DENOM * 10_000n,
      "FLOOR",
    );
    if (extra > 0 && (!campaignMultiplier || extra > campaignMultiplier.points)) {
      campaignMultiplier = { campaignId: c.id, name: c.name, points: extra };
    }
  }
  if (campaignMultiplier) explanation.push(`Kampania „${campaignMultiplier.name}”: +${campaignMultiplier.points}.`);

  let campaignBonus: EarnBreakdown["campaignBonus"] = null;
  for (const c of eligible) {
    if (c.type !== "BONUS_POINTS" || !c.bonusPoints || c.bonusPoints <= 0) continue;
    if (!campaignBonus || c.bonusPoints > campaignBonus.points) {
      campaignBonus = { campaignId: c.id, name: c.name, points: c.bonusPoints };
    }
  }
  if (campaignBonus) explanation.push(`Bonus „${campaignBonus.name}”: +${campaignBonus.points}.`);

  const total = basePoints + tierBonus + (campaignMultiplier?.points ?? 0) + (campaignBonus?.points ?? 0);
  return {
    qualifyingGrosze,
    excludedGrosze,
    basePoints,
    tierBonus,
    campaignMultiplier,
    campaignBonus,
    total,
    belowMinimum: false,
    explanation,
  };
}

/**
 * Korekta po zwrocie liczona kumulatywnie: po zwrocie całego paragonu suma korekt
 * jest dokładnie równa punktom naliczonym (brak „gubienia” lub „zarabiania” na zaokrągleniach przy zwrotach częściowych).
 *
 * @returns liczba punktów do odjęcia w tym zwrocie (>= 0)
 */
export function returnReversal(params: {
  pointsAwarded: number;
  originalQualifyingGrosze: number;
  cumulativeReturnedQualifyingGrosze: number;
  alreadyReversed: number;
}): number {
  const { pointsAwarded, originalQualifyingGrosze, cumulativeReturnedQualifyingGrosze, alreadyReversed } = params;
  if (pointsAwarded <= 0 || originalQualifyingGrosze <= 0) return 0;
  const returned = Math.min(cumulativeReturnedQualifyingGrosze, originalQualifyingGrosze);
  const target =
    returned === originalQualifyingGrosze
      ? pointsAwarded
      : divide(BigInt(pointsAwarded) * BigInt(returned), BigInt(originalQualifyingGrosze), "HALF_UP");
  return Math.max(0, target - alreadyReversed);
}

/** Wartość zwracanej części pozycji (proporcjonalnie, pełny zwrot = dokładna wartość pozycji). */
export function returnedValue(totalGrosze: number, quantity: number, returnedQuantity: number): number {
  if (returnedQuantity >= quantity) return totalGrosze;
  return Math.round((totalGrosze * returnedQuantity) / quantity);
}

export interface DiscountRule {
  type: "AMOUNT_OFF" | "PERCENT_OFF" | "FREE_PRODUCT";
  valueGrosze: number | null;
  percentBp: number | null;
  minBasketGrosze: number;
  maxDiscountGrosze: number | null;
  excludedCategories: string[];
}

/**
 * Rabat kuponu dla koszyka. Gdy przekazano pozycje, kategorie wykluczone kuponu nie wliczają się do koszyka.
 * Rabat nigdy nie przekracza wartości kwalifikującego się koszyka.
 */
export function calculateDiscount(
  rule: DiscountRule,
  basketGrosze: number,
  items?: EarnItem[],
): { ok: true; discountGrosze: number; eligibleGrosze: number } | { ok: false; reason: "BASKET_TOO_SMALL"; eligibleGrosze: number } {
  const eligibleGrosze = items
    ? items.filter((i) => !rule.excludedCategories.includes(i.category)).reduce((s, i) => s + i.totalGrosze, 0)
    : basketGrosze;
  if (eligibleGrosze < Math.max(rule.minBasketGrosze, 1)) return { ok: false, reason: "BASKET_TOO_SMALL", eligibleGrosze };
  let discount = 0;
  if (rule.type === "PERCENT_OFF") {
    discount = Math.floor((eligibleGrosze * (rule.percentBp ?? 0)) / 10_000);
    if (rule.maxDiscountGrosze != null) discount = Math.min(discount, rule.maxDiscountGrosze);
  } else {
    discount = rule.valueGrosze ?? 0;
  }
  return { ok: true, discountGrosze: Math.min(discount, eligibleGrosze), eligibleGrosze };
}
