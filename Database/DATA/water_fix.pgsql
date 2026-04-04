-- =============================================================
-- FILE: fix_water_usage.sql
-- PURPOSE: Correct unrealistically high water readings to
--          realistic Dhaka residential values.
--
-- WHAT THIS UPDATES:
--   1. meter_reading.units_logged   → corrected litre values
--   2. usage.unit_used              → corrected to match readings
--   3. bill_document + bill_postpaid → recalculated energy/totals
--      for Nasreen (connection 6) — postpaid water
--   4. balance_transaction amounts  → corrected for prepaid water
--      debit transactions (Rahim meter 2, Tania meter 10)
--   4. prepaid_account.balance      → recalculated from scratch
--      for Rahim and Tania's water accounts
--
-- REALISTIC VALUES (WASA metered, family of 4, apartment):
--   Rahim  (meter 2): 910–1,410 L/month
--   Nasreen(meter 6): 820–1,150 L/month
--   Tania  (meter 10): 850–1,080 L/month
--
-- Run this ONCE after the original seed has been applied.
-- =============================================================

BEGIN;

-- ==============================================================
-- STEP 1: UPDATE meter_reading.units_logged
-- ==============================================================

-- ── Rahim Water (meter_id=2, reading_ids 25..48) ─────────────
UPDATE meter_reading SET units_logged =  980.00 WHERE reading_id = 25;
UPDATE meter_reading SET units_logged = 1020.00 WHERE reading_id = 26;
UPDATE meter_reading SET units_logged = 1180.00 WHERE reading_id = 27;
UPDATE meter_reading SET units_logged = 1320.00 WHERE reading_id = 28;
UPDATE meter_reading SET units_logged = 1400.00 WHERE reading_id = 29;
UPDATE meter_reading SET units_logged = 1350.00 WHERE reading_id = 30;
UPDATE meter_reading SET units_logged = 1280.00 WHERE reading_id = 31;
UPDATE meter_reading SET units_logged = 1100.00 WHERE reading_id = 32;
UPDATE meter_reading SET units_logged = 1050.00 WHERE reading_id = 33;
UPDATE meter_reading SET units_logged =  940.00 WHERE reading_id = 34;
UPDATE meter_reading SET units_logged =  920.00 WHERE reading_id = 35;
UPDATE meter_reading SET units_logged =  960.00 WHERE reading_id = 36;
UPDATE meter_reading SET units_logged = 1010.00 WHERE reading_id = 37;
UPDATE meter_reading SET units_logged = 1080.00 WHERE reading_id = 38;
UPDATE meter_reading SET units_logged = 1220.00 WHERE reading_id = 39;
UPDATE meter_reading SET units_logged = 1380.00 WHERE reading_id = 40;
UPDATE meter_reading SET units_logged = 1410.00 WHERE reading_id = 41;
UPDATE meter_reading SET units_logged = 1360.00 WHERE reading_id = 42;
UPDATE meter_reading SET units_logged = 1240.00 WHERE reading_id = 43;
UPDATE meter_reading SET units_logged = 1090.00 WHERE reading_id = 44;
UPDATE meter_reading SET units_logged = 1000.00 WHERE reading_id = 45;
UPDATE meter_reading SET units_logged =  930.00 WHERE reading_id = 46;
UPDATE meter_reading SET units_logged =  910.00 WHERE reading_id = 47;
UPDATE meter_reading SET units_logged =  970.00 WHERE reading_id = 48;

-- ── Nasreen Water (meter_id=6, reading_ids 85..90) ────────────
UPDATE meter_reading SET units_logged = 1150.00 WHERE reading_id = 85;
UPDATE meter_reading SET units_logged = 1080.00 WHERE reading_id = 86;
UPDATE meter_reading SET units_logged =  980.00 WHERE reading_id = 87;
UPDATE meter_reading SET units_logged =  870.00 WHERE reading_id = 88;
UPDATE meter_reading SET units_logged =  820.00 WHERE reading_id = 89;
UPDATE meter_reading SET units_logged =  910.00 WHERE reading_id = 90;

-- ── Tania Water (meter_id=10, reading_ids 109..114) ───────────
UPDATE meter_reading SET units_logged = 1020.00 WHERE reading_id = 109;
UPDATE meter_reading SET units_logged =  980.00 WHERE reading_id = 110;
UPDATE meter_reading SET units_logged =  920.00 WHERE reading_id = 111;
UPDATE meter_reading SET units_logged =  860.00 WHERE reading_id = 112;
UPDATE meter_reading SET units_logged =  850.00 WHERE reading_id = 113;
UPDATE meter_reading SET units_logged =  890.00 WHERE reading_id = 114;


-- ==============================================================
-- STEP 2: UPDATE usage.unit_used to match corrected readings
-- The usage_id is derived from time_to in the trigger, so we
-- match on meter_id + time_from to identify each row safely.
-- ==============================================================

-- ── Rahim Water (meter_id=2) ──────────────────────────────────
UPDATE usage SET unit_used =  980.00 WHERE meter_id=2 AND time_from='2024-03-01 00:00:00';
UPDATE usage SET unit_used = 1020.00 WHERE meter_id=2 AND time_from='2024-04-01 00:00:00';
UPDATE usage SET unit_used = 1180.00 WHERE meter_id=2 AND time_from='2024-05-01 00:00:00';
UPDATE usage SET unit_used = 1320.00 WHERE meter_id=2 AND time_from='2024-06-01 00:00:00';
UPDATE usage SET unit_used = 1400.00 WHERE meter_id=2 AND time_from='2024-07-01 00:00:00';
UPDATE usage SET unit_used = 1350.00 WHERE meter_id=2 AND time_from='2024-08-01 00:00:00';
UPDATE usage SET unit_used = 1280.00 WHERE meter_id=2 AND time_from='2024-09-01 00:00:00';
UPDATE usage SET unit_used = 1100.00 WHERE meter_id=2 AND time_from='2024-10-01 00:00:00';
UPDATE usage SET unit_used = 1050.00 WHERE meter_id=2 AND time_from='2024-11-01 00:00:00';
UPDATE usage SET unit_used =  940.00 WHERE meter_id=2 AND time_from='2024-12-01 00:00:00';
UPDATE usage SET unit_used =  920.00 WHERE meter_id=2 AND time_from='2025-01-01 00:00:00';
UPDATE usage SET unit_used =  960.00 WHERE meter_id=2 AND time_from='2025-02-01 00:00:00';
UPDATE usage SET unit_used = 1010.00 WHERE meter_id=2 AND time_from='2025-03-01 00:00:00';
UPDATE usage SET unit_used = 1080.00 WHERE meter_id=2 AND time_from='2025-04-01 00:00:00';
UPDATE usage SET unit_used = 1220.00 WHERE meter_id=2 AND time_from='2025-05-01 00:00:00';
UPDATE usage SET unit_used = 1380.00 WHERE meter_id=2 AND time_from='2025-06-01 00:00:00';
UPDATE usage SET unit_used = 1410.00 WHERE meter_id=2 AND time_from='2025-07-01 00:00:00';
UPDATE usage SET unit_used = 1360.00 WHERE meter_id=2 AND time_from='2025-08-01 00:00:00';
UPDATE usage SET unit_used = 1240.00 WHERE meter_id=2 AND time_from='2025-09-01 00:00:00';
UPDATE usage SET unit_used = 1090.00 WHERE meter_id=2 AND time_from='2025-10-01 00:00:00';
UPDATE usage SET unit_used = 1000.00 WHERE meter_id=2 AND time_from='2025-11-01 00:00:00';
UPDATE usage SET unit_used =  930.00 WHERE meter_id=2 AND time_from='2025-12-01 00:00:00';
UPDATE usage SET unit_used =  910.00 WHERE meter_id=2 AND time_from='2026-01-01 00:00:00';
UPDATE usage SET unit_used =  970.00 WHERE meter_id=2 AND time_from='2026-02-01 00:00:00';

-- ── Nasreen Water (meter_id=6) ────────────────────────────────
UPDATE usage SET unit_used = 1150.00 WHERE meter_id=6 AND time_from='2025-09-01 00:00:00';
UPDATE usage SET unit_used = 1080.00 WHERE meter_id=6 AND time_from='2025-10-01 00:00:00';
UPDATE usage SET unit_used =  980.00 WHERE meter_id=6 AND time_from='2025-11-01 00:00:00';
UPDATE usage SET unit_used =  870.00 WHERE meter_id=6 AND time_from='2025-12-01 00:00:00';
UPDATE usage SET unit_used =  820.00 WHERE meter_id=6 AND time_from='2026-01-01 00:00:00';
UPDATE usage SET unit_used =  910.00 WHERE meter_id=6 AND time_from='2026-02-01 00:00:00';

-- ── Tania Water (meter_id=10) ─────────────────────────────────
UPDATE usage SET unit_used = 1020.00 WHERE meter_id=10 AND time_from='2025-09-01 00:00:00';
UPDATE usage SET unit_used =  980.00 WHERE meter_id=10 AND time_from='2025-10-01 00:00:00';
UPDATE usage SET unit_used =  920.00 WHERE meter_id=10 AND time_from='2025-11-01 00:00:00';
UPDATE usage SET unit_used =  860.00 WHERE meter_id=10 AND time_from='2025-12-01 00:00:00';
UPDATE usage SET unit_used =  850.00 WHERE meter_id=10 AND time_from='2026-01-01 00:00:00';
UPDATE usage SET unit_used =  890.00 WHERE meter_id=10 AND time_from='2026-02-01 00:00:00';


-- ==============================================================
-- STEP 3: Recalculate Nasreen's postpaid water bills
-- energy_amount = unit_used * rate (0.01670/L)
-- fixed charge = ৳50 sewerage (connection_charge)
-- subtotal = energy + fixed
-- vat = 0 (residential water is VAT exempt)
-- total = subtotal
-- ==============================================================
UPDATE bill_document bd
SET
  energy_amount = ROUND(
    (SELECT SUM(u.unit_used) * 0.01670
     FROM usage u
     WHERE u.meter_id = 6
       AND u.time_to >= bp.bill_period_start::TIMESTAMP
       AND u.time_to <  (bp.bill_period_end + INTERVAL '1 day')::TIMESTAMP
    ), 2),
  subtotal = ROUND(
    (SELECT SUM(u.unit_used) * 0.01670
     FROM usage u
     WHERE u.meter_id = 6
       AND u.time_to >= bp.bill_period_start::TIMESTAMP
       AND u.time_to <  (bp.bill_period_end + INTERVAL '1 day')::TIMESTAMP
    ) + 50.00, 2),
  vat_amount = 0.00,
  total_amount = ROUND(
    (SELECT SUM(u.unit_used) * 0.01670
     FROM usage u
     WHERE u.meter_id = 6
       AND u.time_to >= bp.bill_period_start::TIMESTAMP
       AND u.time_to <  (bp.bill_period_end + INTERVAL '1 day')::TIMESTAMP
    ) + 50.00, 2)
FROM bill_postpaid bp
WHERE bd.bill_document_id = bp.bill_document_id
  AND bd.connection_id = 6;


-- ==============================================================
-- STEP 4: Fix prepaid balance_transactions for water DEBIT rows
-- Recalculate transaction_amount = unit_used * 0.01670
-- Then recompute balance_after as a running balance.
-- ==============================================================

-- ── Rahim Water prepaid debits (meter_id=2) ───────────────────
UPDATE balance_transaction bt
SET transaction_amount = ROUND(u.unit_used * 0.01670, 2)
FROM usage u
WHERE bt.meter_id = u.meter_id
  AND bt.usage_id  = u.usage_id
  AND bt.transaction_type = 'DEBIT'
  AND u.meter_id = 2;

-- ── Tania Water prepaid debits (meter_id=10) ─────────────────
UPDATE balance_transaction bt
SET transaction_amount = ROUND(u.unit_used * 0.01670, 2)
FROM usage u
WHERE bt.meter_id = u.meter_id
  AND bt.usage_id  = u.usage_id
  AND bt.transaction_type = 'DEBIT'
  AND u.meter_id = 10;


-- ==============================================================
-- STEP 5: Recompute balance_after as running total per account
-- and sync prepaid_account.balance to the final value.
-- ==============================================================

-- Recompute balance_after for each transaction in order
WITH ordered AS (
  SELECT
    transaction_id,
    prepaid_account_id,
    transaction_amount,
    transaction_type,
    transaction_time,
    ROW_NUMBER() OVER (
      PARTITION BY prepaid_account_id
      ORDER BY transaction_time, transaction_id
    ) AS rn
  FROM balance_transaction
  WHERE prepaid_account_id IN (
    SELECT prepaid_account_id FROM prepaid_account
    WHERE connection_id IN (2, 10)  -- Rahim water, Tania water
  )
),
running AS (
  SELECT
    o.transaction_id,
    SUM(
      CASE WHEN o2.transaction_type ILIKE 'CREDIT'
           THEN  o2.transaction_amount
           ELSE -o2.transaction_amount
      END
    ) AS new_balance_after
  FROM ordered o
  JOIN ordered o2
    ON o2.prepaid_account_id = o.prepaid_account_id
   AND o2.rn <= o.rn
  GROUP BY o.transaction_id
)
UPDATE balance_transaction bt
SET balance_after = r.new_balance_after
FROM running r
WHERE bt.transaction_id = r.transaction_id;

-- Sync prepaid_account.balance to the latest balance_after
UPDATE prepaid_account pa
SET balance = (
  SELECT bt.balance_after
  FROM balance_transaction bt
  WHERE bt.prepaid_account_id = pa.prepaid_account_id
  ORDER BY bt.transaction_time DESC, bt.transaction_id DESC
  LIMIT 1
)
WHERE pa.connection_id IN (2, 10);


-- ==============================================================
-- STEP 6: Verify — quick sanity check queries
-- Run these manually after the script to confirm correctness.
-- ==============================================================
-- Check corrected usage values:
--   SELECT meter_id, time_from, unit_used FROM usage
--   WHERE meter_id IN (2,6,10) ORDER BY meter_id, time_from;
--
-- Check Nasreen's corrected bills (should be ~৳64–69/month):
--   SELECT bp.bill_period_start, bd.energy_amount,
--          bd.subtotal, bd.total_amount, bd.bill_status
--   FROM bill_document bd
--   JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
--   WHERE bd.connection_id = 6 ORDER BY bp.bill_period_start;
--
-- Check Rahim's water prepaid balance:
--   SELECT balance FROM prepaid_account WHERE connection_id = 2;
--
-- Check Tania's water prepaid balance:
--   SELECT balance FROM prepaid_account WHERE connection_id = 10;

COMMIT;