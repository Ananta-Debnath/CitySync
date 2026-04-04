-- =============================================================
-- FILE: 03_tariffs.sql
-- PURPOSE: Seed realistic tariff structures based on official
--          Bangladesh rates (effective 2024).
--
-- Sources:
--   Electricity: DESCO/BPDB LT retail tariff, Feb 2024
--     - LT-A Residential: 7-slab progressive, demand ৳42/kW, 5% VAT
--     - LT-E Commercial:  Peak/Off-Peak, demand ৳90/kW, 5% VAT
--   Water: Dhaka WASA, Jul 2024
--     - Residential: ৳16.70 per 1,000 litres (flat, VAT exempt)
--     - Commercial:  ৳46.20 per 1,000 litres (flat, 5% VAT)
--   Gas: Titas Gas (BERC order, Feb 2024)
--     - Residential: ৳18.00 per cubic metre (VAT exempt)
--     - Commercial:  ৳30.50 per cubic metre (5% VAT)
--
-- Tariff IDs:
--   1 = Electricity Residential (LT-A)
--   2 = Electricity Commercial  (LT-E)
--   3 = Water Residential
--   4 = Water Commercial
--   5 = Gas Residential
--   6 = Gas Commercial
-- =============================================================

-- ─── TARIFF HEADERS ───────────────────────────────────────────
INSERT INTO tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method,
                    effective_from, vat_rate, is_vat_exempt, is_active) VALUES
  -- Electricity
  (1, 1, 'DESCO LT-A Residential',  'Residential', 'Slab', '2024-02-01', 5.00, FALSE, TRUE),
  (2, 1, 'DESCO LT-E Commercial',   'Commercial',  'Slab', '2024-02-01', 5.00, FALSE, TRUE),
  -- Water
  (3, 2, 'WASA Residential Water',  'Residential', 'Flat', '2024-07-01', 0.00, TRUE,  TRUE),
  (4, 2, 'WASA Commercial Water',   'Commercial',  'Flat', '2024-07-01', 5.00, FALSE, TRUE),
  -- Gas
  (5, 3, 'Titas Residential Gas',   'Residential', 'Flat', '2024-02-01', 0.00, TRUE,  TRUE),
  (6, 3, 'Titas Commercial Gas',    'Commercial',  'Flat', '2024-02-01', 5.00, FALSE, TRUE);

SELECT setval('tariff_tariff_id_seq', 6);


-- ─── TARIFF SLABS ─────────────────────────────────────────────

-- -----------------------------------------------------------
-- ELECTRICITY RESIDENTIAL (tariff_id=1) — DESCO LT-A
-- BPDB/DESCO official 7-step slab, Feb 2024
-- Note: slabs 1-7 use FLAT charge type since LT-A residential
-- does not have a separate peak/off-peak structure (unlike LT-E).
-- Demand charge handled via FIXED_CHARGE below.
-- -----------------------------------------------------------
INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) VALUES
  (1, 1, 'FLAT',   0.00,  50.00,  4.63),  -- lifeline rate (0–50 kWh)
  (1, 2, 'FLAT',  50.01,  75.00,  5.26),  -- 51–75 kWh
  (1, 3, 'FLAT',  75.01, 200.00,  7.20),  -- 76–200 kWh
  (1, 4, 'FLAT', 200.01, 300.00,  7.59),  -- 201–300 kWh
  (1, 5, 'FLAT', 300.01, 400.00,  8.02),  -- 301–400 kWh
  (1, 6, 'FLAT', 400.01, 600.00, 12.67),  -- 401–600 kWh
  (1, 7, 'FLAT', 600.01,   NULL, 14.61);  -- 601+ kWh

-- -----------------------------------------------------------
-- ELECTRICITY COMMERCIAL (tariff_id=2) — DESCO LT-E
-- Commercial/Office: Peak and Off-Peak rates
-- Peak: 5 PM – 11 PM | Off-Peak: 11 PM – 5 PM (next day)
-- -----------------------------------------------------------
INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) VALUES
  (2, 1, 'PEAK',      0.00, NULL, 15.62),
  (2, 2, 'OFF-PEAK',  0.00, NULL, 11.71);

-- -----------------------------------------------------------
-- WATER RESIDENTIAL (tariff_id=3) — Dhaka WASA Jul 2024
-- ৳16.70 per 1,000 litres = ৳0.01670 per litre
-- Single flat rate, VAT exempt
-- -----------------------------------------------------------
INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) VALUES
  (3, 1, 'FLAT', 0.00, NULL, 0.01670);

-- -----------------------------------------------------------
-- WATER COMMERCIAL (tariff_id=4) — Dhaka WASA Jul 2024
-- ৳46.20 per 1,000 litres = ৳0.04620 per litre
-- Single flat rate, 5% VAT
-- -----------------------------------------------------------
INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) VALUES
  (4, 1, 'FLAT', 0.00, NULL, 0.04620);

-- -----------------------------------------------------------
-- GAS RESIDENTIAL (tariff_id=5) — Titas Gas Feb 2024
-- ৳18.00 per cubic metre, VAT exempt
-- Typical residential usage: 35–60 m³/month
-- -----------------------------------------------------------
INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) VALUES
  (5, 1, 'FLAT', 0.00, NULL, 18.00);

-- -----------------------------------------------------------
-- GAS COMMERCIAL (tariff_id=6) — Titas Gas Feb 2024
-- ৳30.50 per cubic metre, 5% VAT
-- -----------------------------------------------------------
INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) VALUES
  (6, 1, 'FLAT', 0.00, NULL, 30.50);


-- ─── FIXED CHARGES ────────────────────────────────────────────
-- Based on official DESCO/BPDB/Titas charge schedules.

-- Electricity Residential (LT-A)
-- Demand charge: ৳42/kW of sanctioned load.
-- We model a typical 2kW residential load as a fixed monthly charge.
-- Meter rent: ৳40/month (standard DESCO prepaid/postpaid meter)
INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) VALUES
  (1, 'Meter Rent',      40.00, 'MONTHLY', TRUE),
  (1, 'Demand Charge',   84.00, 'MONTHLY', TRUE);  -- ৳42 × 2kW typical residential load

-- Electricity Commercial (LT-E)
-- Demand charge: ৳90/kVA. Model 5kVA typical small commercial load.
-- Meter rent: ৳100/month for commercial meters
INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) VALUES
  (2, 'Meter Rent',      100.00, 'MONTHLY', TRUE),
  (2, 'Demand Charge',   450.00, 'MONTHLY', TRUE);  -- ৳90 × 5kVA

-- Water Residential
-- Minimum bill / sewerage charge (WASA standard monthly minimum)
INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) VALUES
  (3, 'Sewerage Charge',  50.00, 'MONTHLY', TRUE);

-- Water Commercial
INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) VALUES
  (4, 'Sewerage Charge', 150.00, 'MONTHLY', TRUE);

-- Gas Residential
-- Meter rent: ৳200/month (Titas prepaid meter rent, Jan 2024 revision)
INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) VALUES
  (5, 'Meter Rent', 200.00, 'MONTHLY', TRUE);

-- Gas Commercial
-- Meter rent: ৳300/month for commercial gas meters
INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) VALUES
  (6, 'Meter Rent',       300.00, 'MONTHLY', TRUE),
  (6, 'Safety Surcharge', 150.00, 'MONTHLY', TRUE);
