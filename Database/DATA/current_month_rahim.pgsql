-- =============================================================
-- FILE: current_month_rahim.sql
-- PURPOSE: Add Mar 2026 (full) and Apr 2026 (4 days, partial)
--          usage and bills for Rahim's 3 connections.
--
-- APPROACH:
--   Mar 2026 → full month reading → approved → bill generated
--   Apr 2026 → partial reading (1–4 Apr) → approved → usage only
--              NO bill yet (month not closed, bill can't be generated)
--
-- Reading IDs continue from 114 (last used):
--   115 = Rahim electricity Mar 2026
--   116 = Rahim gas         Mar 2026
--   117 = Rahim water       Mar 2026
--   118 = Rahim electricity Apr 1–4 2026  (partial)
--   119 = Rahim gas         Apr 1–4 2026  (partial)
--   120 = Rahim water       Apr 1–4 2026  (partial)
--
-- Partial April usage estimates (4 days out of 30):
--   Electricity: ~4/30 × 165 kWh ≈ 22 kWh   (shoulder month)
--   Gas:         ~4/30 × 46 m³  ≈  6 m³
--   Water:       ~4/30 × 1000 L ≈ 130 L
-- =============================================================

BEGIN;

-- ==============================================================
-- MARCH 2026 — full month readings
-- ==============================================================

INSERT INTO meter_reading (meter_id, tariff_id, slab_num, field_worker_id,
  time_from, time_to, units_logged, reading_date) VALUES
  (1, 1, 3, 11, '2026-03-01 00:00:00', '2026-03-31 23:59:59', 165.00, '2026-04-02 10:00:00'),  -- electricity: spring shoulder
  (3, 5, 1, 13, '2026-03-01 00:00:00', '2026-03-31 23:59:59',  46.00, '2026-04-02 12:00:00'),  -- gas: tapering off from winter
  (2, 3, 1, 12, '2026-03-01 00:00:00', '2026-03-31 23:59:59', 1020.00, '2026-04-02 11:00:00'); -- water: normal residential
-- Reading IDs: 115 (electricity), 116 (gas), 117 (water)

-- Approve → creates usage rows
-- Electricity & gas are postpaid (no balance trigger)
-- Water is prepaid (usage_after_insert fires DEBIT automatically)
SELECT create_usage_from_reading(121, 9);  -- electricity Mar 2026
SELECT create_usage_from_reading(122, 9);  -- gas Mar 2026
SELECT create_usage_from_reading(123, 9);  -- water Mar 2026 (triggers prepaid DEBIT)

-- Generate postpaid bills for March 2026
-- Electricity (connection 1) — will be UNPAID, due Apr 20
CALL create_postpaid_bill_for_connection(1, '2026-03-01', '2026-03-31', 15, '2026-04-05');

-- Gas (connection 3) — will be UNPAID, due Apr 20
CALL create_postpaid_bill_for_connection(3, '2026-03-01', '2026-03-31', 15, '2026-04-05');

-- Water (connection 2) is prepaid — no bill generated, balance already debited by trigger


-- ==============================================================
-- APRIL 2026 — partial, 4 days (Apr 1–4)
-- ==============================================================

INSERT INTO meter_reading (meter_id, tariff_id, slab_num, field_worker_id,
  time_from, time_to, units_logged, reading_date) VALUES
  (1, 1, 2, 11, '2026-04-01 00:00:00', '2026-04-03 23:59:59',  22.00, '2026-04-04 10:00:00'),  -- electricity: ~22 kWh / 4 days
  (3, 5, 1, 13, '2026-04-01 00:00:00', '2026-04-03 23:59:59',   6.00, '2026-04-04 12:00:00'),  -- gas: ~6 m³ / 4 days
  (2, 3, 1, 12, '2026-04-01 00:00:00', '2026-04-03 23:59:59', 130.00, '2026-04-04 11:00:00');  -- water: ~130 L / 4 days
-- Reading IDs: 118 (electricity), 119 (gas), 120 (water)

-- Approve partial readings → usage rows only, no bills
SELECT create_usage_from_reading(127, 9);  -- electricity partial Apr
SELECT create_usage_from_reading(128, 9);  -- gas partial Apr
SELECT create_usage_from_reading(129, 9);  -- water partial Apr (triggers prepaid DEBIT)

-- No bill calls for April — month is still open.
-- Bills will be generated when April closes (via create_monthly_bills).

COMMIT;


SELECT CURRENT_TIMESTAMP;