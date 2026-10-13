-- Reguły integralności, których nie da się wyrazić w schemacie Prisma.

-- 1. Rejestr punktów i dziennik audytowy są niezmienne (tylko INSERT).
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabela % jest tylko do dopisywania (operacja % zabroniona)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER points_ledger_immutable
  BEFORE UPDATE OR DELETE ON "PointsLedger"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Historia zgód: dozwolone tylko dopisywanie (usunięcie wyłącznie kaskadowo nie występuje — konta są anonimizowane).
CREATE TRIGGER consent_record_immutable
  BEFORE UPDATE ON "ConsentRecord"
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- 2. Ograniczenia wartości.
ALTER TABLE "PointsLedger" ADD CONSTRAINT points_ledger_nonzero CHECK (points <> 0);
ALTER TABLE "PointsLedger" ADD CONSTRAINT points_ledger_reason_present CHECK (length(trim(reason)) >= 3);

ALTER TABLE "TransactionItem" ADD CONSTRAINT item_quantity_positive CHECK (quantity > 0);
ALTER TABLE "TransactionItem" ADD CONSTRAINT item_amounts_valid CHECK (
  "unitPriceGrosze" >= 0 AND "discountGrosze" >= 0 AND "totalGrosze" >= 0
  AND "returnedQuantity" >= 0 AND "returnedQuantity" <= quantity
);
ALTER TABLE "Transaction" ADD CONSTRAINT transaction_amounts_valid CHECK (
  "totalGrosze" >= 0 AND "qualifyingGrosze" >= 0 AND "discountGrosze" >= 0
);

ALTER TABLE "Reward" ADD CONSTRAINT reward_values_valid CHECK (
  "pointsCost" > 0
  AND "minBasketGrosze" >= 0
  AND "validDays" BETWEEN 1 AND 730
  AND (stock IS NULL OR stock >= 0)
  AND ("perCustomerLimit" IS NULL OR "perCustomerLimit" > 0)
  AND (
    (type = 'PERCENT_OFF' AND "percentBp" BETWEEN 1 AND 10000)
    OR (type IN ('AMOUNT_OFF', 'FREE_PRODUCT') AND "valueGrosze" > 0)
  )
);

ALTER TABLE "Coupon" ADD CONSTRAINT coupon_dates_valid CHECK ("expiresAt" > "validFrom");
ALTER TABLE "Coupon" ADD CONSTRAINT coupon_points_nonnegative CHECK ("pointsSpent" >= 0);

ALTER TABLE "CouponRedemption" ADD CONSTRAINT redemption_amounts_valid CHECK (
  "discountGrosze" >= 0 AND "basketGrosze" >= 0
);

-- Kupon może mieć co najwyżej jedną aktywną (niezwolnioną) realizację — ochrona przed podwójnym użyciem.
CREATE UNIQUE INDEX coupon_single_active_redemption
  ON "CouponRedemption" ("couponId") WHERE "releasedAt" IS NULL;

ALTER TABLE "ProgramConfig" ADD CONSTRAINT program_config_valid CHECK (
  "earnRateBp" BETWEEN 0 AND 1000000
  AND "minQualifyingGrosze" >= 0
  AND "tierWindowDays" BETWEEN 30 AND 1095
  AND "maxManualAdjustment" > 0
  AND "couponDefaultValidDays" BETWEEN 1 AND 730
);
-- Tylko jedna aktywna konfiguracja.
CREATE UNIQUE INDEX program_config_single_active ON "ProgramConfig" (active) WHERE active = true;

ALTER TABLE "Tier" ADD CONSTRAINT tier_values_valid CHECK ("minPoints" >= 0 AND "multiplierBp" BETWEEN 10000 AND 50000);

ALTER TABLE "Campaign" ADD CONSTRAINT campaign_dates_valid CHECK ("endsAt" > "startsAt");
ALTER TABLE "Campaign" ADD CONSTRAINT campaign_values_valid CHECK (
  (type <> 'POINTS_MULTIPLIER' OR "multiplierBp" BETWEEN 10001 AND 100000)
  AND (type <> 'BONUS_POINTS' OR "bonusPoints" BETWEEN 1 AND 100000)
);

ALTER TABLE "Profile" ADD CONSTRAINT profile_birth_month_valid CHECK ("birthMonth" IS NULL OR "birthMonth" BETWEEN 1 AND 12);
ALTER TABLE "GardenTask" ADD CONSTRAINT garden_task_month_valid CHECK (month BETWEEN 1 AND 12);
ALTER TABLE "ShoppingListItem" ADD CONSTRAINT shopping_quantity_valid CHECK (quantity BETWEEN 1 AND 999);
