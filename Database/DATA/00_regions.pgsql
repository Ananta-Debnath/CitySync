-- =============================================================
-- FILE: 00_regions.sql
-- PURPOSE: Seed the 20 Dhaka thana/area regions.
--
-- IDs are fixed with OVERRIDING SYSTEM VALUE to guarantee they
-- match the assumptions in all downstream seed files:
--   1=Mirpur,       2=Mohammadpur,  3=Dhanmondi,   4=Uttara,
--   5=Gulshan,      6=Banani,       7=Tejgaon,      8=Motijheel,
--   9=Wari,        10=Lalbagh,     11=Hazaribagh,  12=Kamrangirchar,
--  13=Demra,       14=Khilgaon,    15=Badda,       16=Rampura,
--  17=Khilkhet,    18=Cantonment,  19=Paltan,      20=Shahbagh
--
-- Run this BEFORE all other seed files.
-- =============================================================

INSERT INTO region (region_id, region_name, postal_code, max_connections, is_accepting_connections)
OVERRIDING SYSTEM VALUE
VALUES
  ( 1, 'Mirpur',         '1216', 5000, TRUE),
  ( 2, 'Mohammadpur',    '1207', 4000, TRUE),
  ( 3, 'Dhanmondi',      '1205', 3500, TRUE),
  ( 4, 'Uttara',         '1230', 5000, TRUE),
  ( 5, 'Gulshan',        '1212', 3000, TRUE),
  ( 6, 'Banani',         '1213', 2500, TRUE),
  ( 7, 'Tejgaon',        '1215', 3000, TRUE),
  ( 8, 'Motijheel',      '1000', 3000, TRUE),
  ( 9, 'Wari',           '1203', 2000, TRUE),
  (10, 'Lalbagh',        '1211', 2500, TRUE),
  (11, 'Hazaribagh',     '1209', 2000, TRUE),
  (12, 'Kamrangirchar',  '1211', 2000, TRUE),
  (13, 'Demra',          '1361', 3000, TRUE),
  (14, 'Khilgaon',       '1219', 3000, TRUE),
  (15, 'Badda',          '1212', 3500, TRUE),
  (16, 'Rampura',        '1219', 2500, TRUE),
  (17, 'Khilkhet',       '1229', 2500, TRUE),
  (18, 'Cantonment',     '1206', 1500, TRUE),
  (19, 'Paltan',         '1000', 2000, TRUE),
  (20, 'Shahbagh',       '1000', 2000, TRUE);

-- Sync the serial sequence so future INSERTs don't collide
SELECT setval('region_region_id_seq', 20);
