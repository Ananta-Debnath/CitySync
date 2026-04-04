-- =============================================================
-- FILE: 04_people.sql
-- PURPOSE: Seed all person-related records.
--
-- Cast of characters:
--
--  SHOWCASE CONSUMER  (person_id = 1)
--    Rahim Uddin — Mirpur resident. Has all 3 utility connections,
--    both prepaid & postpaid, 12 months of usage history, paid/
--    unpaid/overdue bills, complaints, and applications.
--
--  OTHER CONSUMERS    (person_id = 2..8)
--    Mix of residential and commercial consumers across Dhaka thanas.
--
--  EMPLOYEES          (person_id = 9, 10)
--    Billing staff who approve meter readings and review applications.
--
--  FIELD WORKERS      (person_id = 11..35)
--    25 technicians spread unevenly across regions with deliberately
--    varied performance for rich analytics output.
--
-- REGION IDs assumed (from your region file — adjust if different):
--   1=Mirpur,       2=Mohammadpur,  3=Dhanmondi,   4=Uttara,
--   5=Gulshan,      6=Banani,       7=Tejgaon,      8=Motijheel,
--   9=Wari,        10=Lalbagh,     11=Hazaribagh,  12=Kamrangirchar,
--  13=Demra,       14=Khilgaon,    15=Badda,       16=Rampura,
--  17=Khilkhet,    18=Cantonment,  19=Paltan,      20=Shahbagh
-- =============================================================


-- ─── ADDRESSES ────────────────────────────────────────────────
-- address_id mirrors person_id for clarity (1..35)
INSERT INTO address (address_id, region_id, house_num, street_name, landmark) VALUES
  -- Consumers (1–8)
  (1,  1,  '12',   'Mirpur Road',               'Near Mirpur-10 Metro'),
  (2,  2,  '45',   'Satmasjid Road',            'Mohammadpur Bus Stand'),
  (3,  3,  '8A',   'Dhanmondi Lake Road',       'Rabindra Sarobar'),
  (4,  4,  '77',   'Sector 7 Main Road',        'Uttara Model Town'),
  (5,  5,  '3',    'Gulshan Avenue',            'Gulshan-1 Circle'),
  (6,  2,  '102',  'Nurjahan Road',             'Mohammadpur Town Hall'),
  (7,  3,  '21B',  'Jigatola Road',             'Jigatola Bus Stop'),
  (8,  4,  '55',   'Sector 3 Road',             'Azampur Market'),
  -- Employees (9–10)
  (9,  5,  '18',   'Gulshan-2 Avenue',          'Gulshan-2 Circle'),
  (10, 6,  '9',    'Banani Road 11',            'Banani Club'),
  -- Field Workers (11–35) — spread across regions
  (11,  1, '33',   'Pallabi Main Road',         'Pallabi Thana'),
  (12,  1, '67',   'Mirpur Section 12',         'DOHS Mirpur'),
  (13,  1, '14',   'Shewrapara Road',           'Shewrapara Metro'),
  (14,  2, '88',   'Iqbal Road',                'Mohammadpur Krishi Market'),
  (15,  2, '5',    'Asad Gate Road',            'Asad Gate'),
  (16,  2, '29',   'Geneva Camp Road',          'PC Culture Housing'),
  (17,  3, '42',   'Dhanmondi 27',              'Dhanmondi Lake Park'),
  (18,  3, '11',   'Satmosjid Housing Road',    'Star Kabab Dhanmondi'),
  (19,  4, '7',    'Sector 11 Road',            'Uttara Diabari'),
  (20,  4, '90',   'Sector 4 Avenue',           'House Building Uttara'),
  (21,  7, '23',   'Tejgaon Link Road',         'Tejgaon Industrial Area'),
  (22,  7, '56',   'Farmgate Road',             'Farmgate Overbridge'),
  (23,  8, '3',    'Shapla Chattar Road',       'Motijheel BRTC'),
  (24,  8, '18',   'Dilkusha Commercial Area',  'Sonali Bank HQ'),
  (25, 10, '44',   'Lalbagh Fort Road',         'Lalbagh Fort Gate'),
  (26, 10, '71',   'Azimpur Road',              'Azimpur Colony'),
  (27, 14, '9',    'Khilgaon Main Road',        'Khilgaon Rail Gate'),
  (28, 14, '36',   'Taltola Road',              'Merul Badda'),
  (29, 15, '62',   'Badda Link Road',           'Badda Union Parishad'),
  (30, 15, '18',   'Satarkul Road',             'Natun Bazar Badda'),
  (31, 16, '27',   'Rampura TV Road',           'Rampura Bridge'),
  (32, 19, '4',    'Paltan Main Road',          'BNP Office Paltan'),
  (33, 20, '15',   'Shahbagh Avenue',           'Shahbagh Intersection'),
  (34,  5, '88',   'Gulshan-1 Road 36',         'Gulshan DCC Market'),
  (35,  6, '12',   'Banani DOHS Road',          'Banani Kamal Ataturk');

SELECT setval('address_address_id_seq', 35);


-- ─── PERSONS ──────────────────────────────────────────────────
INSERT INTO person (person_id, address_id, first_name, last_name, date_of_birth, gender, phone_number, national_id) VALUES
  -- Consumers
  (1,  1,  'Rahim',     'Uddin',        '1985-03-15', 'Male',   '01711000001', 'NID1000001'),
  (2,  2,  'Farida',    'Begum',        '1990-07-22', 'Female', '01711000002', 'NID1000002'),
  (3,  3,  'Kamal',     'Hossain',      '1978-11-05', 'Male',   '01711000003', 'NID1000003'),
  (4,  4,  'Nasreen',   'Akter',        '1995-01-30', 'Female', '01711000004', 'NID1000004'),
  (5,  5,  'Shahidul',  'Islam',        '1982-06-18', 'Male',   '01711000005', 'NID1000005'),
  (6,  6,  'Momena',    'Khatun',       '1988-09-09', 'Female', '01711000006', 'NID1000006'),
  (7,  7,  'Rafiqul',   'Alam',         '1975-12-25', 'Male',   '01711000007', 'NID1000007'),
  (8,  8,  'Tania',     'Rahman',       '1993-04-14', 'Female', '01711000008', 'NID1000008'),
  -- Employees
  (9,  9,  'Jahangir',  'Kabir',        '1980-02-20', 'Male',   '01811000009', 'NID1000009'),
  (10, 10, 'Salma',     'Chowdhury',    '1987-08-11', 'Female', '01811000010', 'NID1000010'),
  -- Field Workers (11–35)
  -- Mirpur cluster (11–13): HIGH performers
  (11, 11, 'Delwar',    'Mia',          '1983-05-05', 'Male',   '01911000011', 'NID1000011'),
  (12, 12, 'Nasima',    'Akhter',       '1991-10-19', 'Female', '01911000012', 'NID1000012'),
  (13, 13, 'Rubel',     'Hasan',        '1986-03-22', 'Male',   '01911000013', 'NID1000013'),
  -- Mohammadpur cluster (14–16): MIXED (1 high, 1 avg, 1 poor)
  (14, 14, 'Jahanara',  'Sultana',      '1989-07-14', 'Female', '01911000014', 'NID1000014'),
  (15, 15, 'Minhaj',    'Uddin',        '1984-12-01', 'Male',   '01911000015', 'NID1000015'),
  (16, 16, 'Parveen',   'Akter',        '1992-04-30', 'Female', '01911000016', 'NID1000016'),
  -- Dhanmondi cluster (17–18): AVERAGE performers
  (17, 17, 'Sohel',     'Rana',         '1987-09-11', 'Male',   '01911000017', 'NID1000017'),
  (18, 18, 'Roksana',   'Begum',        '1993-02-28', 'Female', '01911000018', 'NID1000018'),
  -- Uttara cluster (19–20): HIGH performer + POOR performer
  (19, 19, 'Faisal',    'Ahmed',        '1981-11-17', 'Male',   '01911000019', 'NID1000019'),
  (20, 20, 'Sharmin',   'Sultana',      '1994-06-06', 'Female', '01911000020', 'NID1000020'),
  -- Tejgaon cluster (21–22): AVERAGE
  (21, 21, 'Rakib',     'Hossain',      '1985-08-23', 'Male',   '01911000021', 'NID1000021'),
  (22, 22, 'Sumaiya',   'Islam',        '1990-01-15', 'Female', '01911000022', 'NID1000022'),
  -- Motijheel (23–24): HIGH + POOR
  (23, 23, 'Alamgir',   'Hossain',      '1979-07-07', 'Male',   '01911000023', 'NID1000023'),
  (24, 24, 'Khaleda',   'Parvin',       '1995-03-19', 'Female', '01911000024', 'NID1000024'),
  -- Lalbagh (25–26): AVERAGE
  (25, 25, 'Monir',     'Ahmed',        '1983-10-10', 'Male',   '01911000025', 'NID1000025'),
  (26, 26, 'Shirina',   'Begum',        '1988-05-25', 'Female', '01911000026', 'NID1000026'),
  -- Khilgaon (27–28): HIGH + AVERAGE
  (27, 27, 'Enamul',    'Haq',          '1980-12-12', 'Male',   '01911000027', 'NID1000027'),
  (28, 28, 'Dilruba',   'Khatun',       '1992-09-09', 'Female', '01911000028', 'NID1000028'),
  -- Badda (29–30): POOR performers
  (29, 29, 'Saiful',    'Islam',        '1986-04-04', 'Male',   '01911000029', 'NID1000029'),
  (30, 30, 'Morsheda',  'Begum',        '1991-11-11', 'Female', '01911000030', 'NID1000030'),
  -- Rampura (31): AVERAGE
  (31, 31, 'Raihan',    'Kabir',        '1984-06-20', 'Male',   '01911000031', 'NID1000031'),
  -- Paltan (32): HIGH
  (32, 32, 'Tamanna',   'Akter',        '1989-02-14', 'Female', '01911000032', 'NID1000032'),
  -- Shahbagh (33): POOR
  (33, 33, 'Mizanur',   'Rahman',       '1977-08-30', 'Male',   '01911000033', 'NID1000033'),
  -- Gulshan (34): HIGH
  (34, 34, 'Nazia',     'Islam',        '1993-03-03', 'Female', '01911000034', 'NID1000034'),
  -- Banani (35): AVERAGE
  (35, 35, 'Touhid',    'Hossain',      '1986-07-17', 'Male',   '01911000035', 'NID1000035');

SELECT setval('person_person_id_seq', 35);


-- ─── ACCOUNTS ─────────────────────────────────────────────────
-- Passwords are bcrypt hashes. Replace with real hashes before production.
-- Placeholder hash used here for all: '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC'
INSERT INTO account (person_id, account_type, email, password_hashed, is_active) VALUES
  -- Consumers
  (1,  'consumer',     'rahim.uddin@gmail.com',            '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (2,  'consumer',     'farida.begum@gmail.com',           '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (3,  'consumer',     'kamal.hossain@gmail.com',          '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (4,  'consumer',     'nasreen.akter@gmail.com',          '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (5,  'consumer',     'shahidul.islam@gmail.com',         '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (6,  'consumer',     'momena.khatun@gmail.com',          '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (7,  'consumer',     'rafiqul.alam.business@gmail.com',  '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (8,  'consumer',     'tania.rahman@gmail.com',           '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  -- Employees
  (9,  'employee',     'jahangir.kabir@desco.gov.bd',      '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (10, 'employee',     'salma.chowdhury@desco.gov.bd',     '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  -- Field Workers
  (11, 'field_worker', 'delwar.mia@desco.gov.bd',          '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (12, 'field_worker', 'nasima.akhter@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (13, 'field_worker', 'rubel.hasan@desco.gov.bd',         '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (14, 'field_worker', 'jahanara.sultana@desco.gov.bd',    '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (15, 'field_worker', 'minhaj.uddin@desco.gov.bd',        '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (16, 'field_worker', 'parveen.akter@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (17, 'field_worker', 'sohel.rana@desco.gov.bd',          '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (18, 'field_worker', 'roksana.begum@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (19, 'field_worker', 'faisal.ahmed@desco.gov.bd',        '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (20, 'field_worker', 'sharmin.sultana@desco.gov.bd',     '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (21, 'field_worker', 'rakib.hossain@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (22, 'field_worker', 'sumaiya.islam@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (23, 'field_worker', 'alamgir.hossain@desco.gov.bd',     '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (24, 'field_worker', 'khaleda.parvin@desco.gov.bd',      '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (25, 'field_worker', 'monir.ahmed@desco.gov.bd',         '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (26, 'field_worker', 'shirina.begum@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (27, 'field_worker', 'enamul.haq@desco.gov.bd',          '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (28, 'field_worker', 'dilruba.khatun@desco.gov.bd',      '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (29, 'field_worker', 'saiful.islam@desco.gov.bd',        '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (30, 'field_worker', 'morsheda.begum@desco.gov.bd',      '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (31, 'field_worker', 'raihan.kabir@desco.gov.bd',        '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (32, 'field_worker', 'tamanna.akter@desco.gov.bd',       '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (33, 'field_worker', 'mizanur.rahman@desco.gov.bd',      '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (34, 'field_worker', 'nazia.islam@desco.gov.bd',         '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE),
  (35, 'field_worker', 'touhid.hossain@desco.gov.bd',      '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC', TRUE);


-- ─── CONSUMERS ────────────────────────────────────────────────
INSERT INTO consumer (person_id, consumer_type, registration_date) VALUES
  (1, 'Individual',  '2020-01-10'),
  (2, 'Individual',  '2020-03-15'),
  (3, 'Commercial',  '2019-06-01'),
  (4, 'Individual',  '2021-08-20'),
  (5, 'Individual',  '2018-11-05'),
  (6, 'Individual',  '2022-02-14'),
  (7, 'Commercial',  '2017-09-30'),
  (8, 'Individual',  '2023-01-01');


-- ─── EMPLOYEES ────────────────────────────────────────────────
INSERT INTO employee (person_id, role, employee_num, hire_date, employment_status) VALUES
  (9,  'Billing Manager',   'EMP-0001', '2015-04-01', 'Active'),
  (10, 'Operations Officer','EMP-0002', '2018-09-15', 'Active');


-- ─── FIELD WORKERS ────────────────────────────────────────────
-- assigned_region_id: home region. Performance profile noted in comments.
INSERT INTO field_worker (person_id, assigned_region_id, expertise, skillset) VALUES
  -- MIRPUR cluster — HIGH performers
  (11, 1,  'Electrical',  'Meter Installation, Fault Detection'),
  (12, 1,  'Electrical',  'Prepaid Meter, Load Testing'),
  (13, 1,  'Plumbing',    'Water Line Repair, Leak Detection'),
  -- MOHAMMADPUR cluster — MIXED
  (14, 2,  'Electrical',  'Meter Reading, Connection Wiring'),   -- HIGH
  (15, 2,  'Gas',         'Gas Line Inspection, Pressure Test'), -- AVERAGE
  (16, 2,  'Electrical',  'Fault Detection'),                    -- POOR
  -- DHANMONDI cluster — AVERAGE
  (17, 3,  'Electrical',  'Meter Reading, Bill Verification'),
  (18, 3,  'Plumbing',    'Water Meter, Pipeline Repair'),
  -- UTTARA cluster — HIGH + POOR
  (19, 4,  'Electrical',  'HT Line, Load Testing, Meter Audit'), -- HIGH
  (20, 4,  'Gas',         'Gas Leak Detection'),                  -- POOR
  -- TEJGAON cluster — AVERAGE
  (21, 7,  'Electrical',  'Industrial Connection, Meter Audit'),
  (22, 7,  'Plumbing',    'Water Pump, Flow Meter'),
  -- MOTIJHEEL — HIGH + POOR
  (23, 8,  'Electrical',  'Commercial Wiring, Fault Isolation'), -- HIGH
  (24, 8,  'Gas',         'Gas Meter Reading'),                  -- POOR
  -- LALBAGH — AVERAGE
  (25, 10, 'Plumbing',    'Pipeline, Water Quality Testing'),
  (26, 10, 'Gas',         'Gas Line Maintenance'),
  -- KHILGAON — HIGH + AVERAGE
  (27, 14, 'Electrical',  'Prepaid Meter, Consumer Audit'),      -- HIGH
  (28, 14, 'Plumbing',    'Pipe Repair, Meter Reading'),
  -- BADDA — POOR performers
  (29, 15, 'Electrical',  'Basic Wiring'),
  (30, 15, 'Gas',         'Gas Meter Reading'),
  -- RAMPURA — AVERAGE
  (31, 16, 'Electrical',  'Meter Reading, Fault Detection'),
  -- PALTAN — HIGH
  (32, 19, 'Electrical',  'Commercial Meter Audit, Load Testing'),
  -- SHAHBAGH — POOR
  (33, 20, 'Plumbing',    'Water Line Repair'),
  -- GULSHAN — HIGH
  (34, 5,  'Electrical',  'High-End Residential, Fault Isolation'),
  -- BANANI — AVERAGE
  (35, 6,  'Gas',         'Gas Meter, Pressure Testing');


-- ─── PAYMENT METHODS (for consumers) ─────────────────────────
-- Showcase consumer (Rahim): has bKash + Dutch-Bangla Bank (bank is default)
SELECT add_payment_method('mobile_banking', 1, NULL, NULL, 'bKash',           '01711000001', NULL, FALSE);
SELECT add_payment_method('bank',           1, 'Dutch-Bangla Bank', '1234567890123', NULL, NULL, NULL, TRUE);

-- Other consumers: one method each
SELECT add_payment_method('mobile_banking', 2, NULL, NULL, 'bKash',  '01711000002', NULL, TRUE);
SELECT add_payment_method('mobile_banking', 3, NULL, NULL, 'Nagad',  '01711000003', NULL, TRUE);
SELECT add_payment_method('bank',           4, 'BRAC Bank', '9876543210001', NULL, NULL, NULL, TRUE);
SELECT add_payment_method('mobile_banking', 5, NULL, NULL, 'bKash',  '01711000005', NULL, TRUE);
SELECT add_payment_method('mobile_banking', 6, NULL, NULL, 'Rocket', '01711000006', NULL, TRUE);
SELECT add_payment_method('mobile_banking', 7, NULL, NULL, 'Nagad',  '01711000007', NULL, TRUE);
SELECT add_payment_method('google_pay',     8, NULL, NULL, NULL,      NULL, 'tania.rahman@gmail.com', TRUE);
