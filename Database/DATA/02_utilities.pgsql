-- =============================================================
-- FILE: 02_utilities.sql
-- PURPOSE: Seed the three Dhaka utility services and make them
--          available across all regions in your region file.
--
-- Utility IDs (fixed so downstream files can reference them):
--   1 = Dhaka Electric Supply Company (DESCO)   [Electricity]
--   2 = Dhaka WASA                              [Water]
--   3 = Titas Gas                               [Gas]
--
-- Run AFTER: 01_reference.sql + your region file.
-- =============================================================

INSERT INTO utility (utility_id, utility_name, utility_type, billing_cycle, unit_of_measurement, status) VALUES
  (1, 'Dhaka Electric Supply Company (DESCO)', 'Electricity', 'Monthly', 'kWh',    'Active'),
  (2, 'Dhaka WASA',                            'Water',       'Monthly', 'Litre',  'Active'),
  (3, 'Titas Gas',                             'Gas',         'Monthly', 'Cubic M','Active');

SELECT setval('utility_utility_id_seq', 3);

-- ─── SUBTYPES ─────────────────────────────────────────────────
INSERT INTO electricity_utility (utility_id, voltage_level, phase_type) VALUES
  (1, '220V', 'Single-Phase');

INSERT INTO water_utility (utility_id, pressure_level, water_source, quality_grade) VALUES
  (2, 'Medium', 'Surface Water', 'Grade-A');

INSERT INTO gas_utility (utility_id, gas_type, pressure_category) VALUES
  (3, 'Natural Gas', 'Medium');

-- ─── UTILITY ↔ REGION AVAILABILITY ───────────────────────────
-- All three utilities available in all regions from your region file.
INSERT INTO utility_region (utility_id, region_id, is_available)
SELECT u.utility_id, r.region_id, TRUE
FROM utility u
CROSS JOIN region r
ON CONFLICT DO NOTHING;
