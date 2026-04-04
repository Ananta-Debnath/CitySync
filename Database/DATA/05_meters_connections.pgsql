-- =============================================================
-- FILE: 05_meters_connections.sql
-- PURPOSE: Seed meters and utility connections for all consumers.
--
-- Meter IDs / Connection IDs are fixed for downstream reference:
--
-- SHOWCASE CONSUMER — Rahim Uddin (person_id=1, address_id=1, region=Mirpur)
--   meter_id=1  → Electricity postpaid (tariff=1, LT-A Residential)
--   meter_id=2  → Water prepaid       (tariff=3, WASA Residential)
--   meter_id=3  → Gas postpaid        (tariff=5, Titas Residential)
--   connection_id=1 → Electricity, Postpaid, Residential → RESIDENTIAL_CONNECTION
--   connection_id=2 → Water,       Prepaid,  Residential → RESIDENTIAL_CONNECTION
--   connection_id=3 → Gas,         Postpaid, Residential → RESIDENTIAL_CONNECTION
--
-- OTHER CONSUMERS
--   meter_id=4..10, connection_id=4..10
--   Mix of postpaid/prepaid, residential/commercial
-- =============================================================


-- ─── METERS ───────────────────────────────────────────────────
INSERT INTO meter (meter_id, address_id, meter_type, is_active) VALUES
  -- Showcase consumer
  (1, 1, 'Digital',   TRUE),   -- electricity
  (2, 1, 'Prepaid',   TRUE),   -- water
  (3, 1, 'Digital',   TRUE),   -- gas
  -- Other consumers
  (4, 2, 'Digital',   TRUE),   -- Farida: electricity postpaid
  (5, 3, 'Digital',   TRUE),   -- Kamal: electricity prepaid (commercial)
  (6, 4, 'Digital',   TRUE),   -- Nasreen: water postpaid
  (7, 5, 'Digital',   TRUE),   -- Shahidul: gas postpaid
  (8, 6, 'Prepaid',   TRUE),   -- Momena: electricity prepaid
  (9, 7, 'Digital',   TRUE),   -- Rafiqul: commercial electricity postpaid
  (10,8, 'Digital',   TRUE);   -- Tania: water prepaid

SELECT setval('meter_meter_id_seq', 10);


-- ─── UTILITY CONNECTIONS ──────────────────────────────────────
INSERT INTO utility_connection (connection_id, tariff_id, consumer_id, meter_id,
  connection_name, payment_type, connection_type, connection_status,
  connection_date, load_requirement) VALUES
  -- Showcase: Rahim Uddin
  (1,  1, 1, 1, 'Rahim Home - Electricity', 'Postpaid', 'Residential', 'Active', '2020-01-15', 2.00),
  (2,  3, 1, 2, 'Rahim Home - Water',       'Prepaid',  'Residential', 'Active', '2020-01-15', NULL),
  (3,  5, 1, 3, 'Rahim Home - Gas',         'Postpaid', 'Residential', 'Active', '2020-01-15', NULL),
  -- Other consumers
  (4,  1, 2, 4, 'Farida Home - Electricity','Postpaid', 'Residential', 'Active', '2020-03-20', 2.00),
  (5,  2, 3, 5, 'Kamal Shop - Electricity', 'Prepaid',  'Commercial',  'Active', '2019-07-01', 5.00),
  (6,  3, 4, 6, 'Nasreen Home - Water',     'Postpaid', 'Residential', 'Active', '2021-09-01', NULL),
  (7,  5, 5, 7, 'Shahidul Home - Gas',      'Postpaid', 'Residential', 'Active', '2018-12-10', NULL),
  (8,  1, 6, 8, 'Momena Home - Electricity','Prepaid',  'Residential', 'Active', '2022-03-05', 1.50),
  (9,  2, 7, 9, 'Rafiqul Office - Elec',    'Postpaid', 'Commercial',  'Active', '2017-10-15', 8.00),
  (10, 3, 8,10, 'Tania Home - Water',       'Prepaid',  'Residential', 'Active', '2023-02-01', NULL);

SELECT setval('utility_connection_connection_id_seq', 10);


-- ─── RESIDENTIAL CONNECTIONS ──────────────────────────────────
INSERT INTO residential_connection (connection_id, property_type, is_subsidized) VALUES
  (1,  'Apartment', FALSE),  -- Rahim electricity
  (2,  'Apartment', FALSE),  -- Rahim water
  (3,  'Apartment', FALSE),  -- Rahim gas
  (4,  'House',     FALSE),  -- Farida
  (6,  'Apartment', TRUE),   -- Nasreen (subsidized)
  (7,  'House',     FALSE),  -- Shahidul
  (8,  'Apartment', TRUE),   -- Momena (subsidized)
  (10, 'Apartment', FALSE);  -- Tania


-- ─── COMMERCIAL CONNECTIONS ───────────────────────────────────
INSERT INTO commercial_connection (connection_id, business_name, operating_hours, tax_id) VALUES
  (5,  'Kamal Electronics',    '9AM–9PM',  'TIN-30045678'),
  (9,  'Rafiqul Traders Ltd',  '8AM–10PM', 'TIN-70098765');
