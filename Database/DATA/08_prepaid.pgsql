-- =============================================================
-- FILE: 08_prepaid.sql
-- PURPOSE: Fund prepaid accounts and approve prepaid meter readings.
--
-- READING ID MAP (from 06_readings_usage.sql):
--   25..48   → Rahim water (meter 2, 24 months)
--   79..84   → Kamal commercial electricity (meter 5, 6 months)
--   97..102  → Momena electricity (meter 8, 6 months)
--   109..114 → Tania water (meter 10, 6 months)
--
-- PREPAID ACCOUNT IDs (auto-created by trigger in 05_):
--   1 → Rahim Water     (connection 2)
--   2 → Kamal Elec      (connection 5)
--   3 → Momena Elec     (connection 8)
--   4 → Tania Water     (connection 10)
--
-- RULE: Always top up BEFORE approving readings so balance stays
-- positive and the meter is never suspended by the trigger.
-- =============================================================


-- ─── RAHIM WATER PREPAID (account=1) ─────────────────────────
-- 24 months: Apr 2024 → Mar 2026
-- Usage: 8,300–14,800 L × ৳0.01670 = ৳139–247/month
-- Top-up ৳350/month provides comfortable headroom.

DO $$
DECLARE
  v_bill_id INTEGER;
  v_method_id INTEGER;
BEGIN
  SELECT method_id INTO v_method_id
  FROM payment_method WHERE consumer_id = 1 AND is_default = TRUE;

  FOR i IN 1..24 LOOP
    v_bill_id := create_prepaid_statement(1, 350.00);
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    VALUES (v_bill_id, v_method_id, 350.00, CURRENT_TIMESTAMP, 'Completed');
  END LOOP;
END $$;

-- Now approve all 24 water readings (IDs 25..48)
SELECT create_usage_from_reading(25, 9);
SELECT create_usage_from_reading(26, 9);
SELECT create_usage_from_reading(27, 9);
SELECT create_usage_from_reading(28, 9);
SELECT create_usage_from_reading(29, 9);
SELECT create_usage_from_reading(30, 9);
SELECT create_usage_from_reading(31, 9);
SELECT create_usage_from_reading(32, 9);
SELECT create_usage_from_reading(33, 9);
SELECT create_usage_from_reading(34, 9);
SELECT create_usage_from_reading(35, 9);
SELECT create_usage_from_reading(36, 9);
SELECT create_usage_from_reading(37, 9);
SELECT create_usage_from_reading(38, 9);
SELECT create_usage_from_reading(39, 9);
SELECT create_usage_from_reading(40, 9);
SELECT create_usage_from_reading(41, 9);
SELECT create_usage_from_reading(42, 9);
SELECT create_usage_from_reading(43, 9);
SELECT create_usage_from_reading(44, 9);
SELECT create_usage_from_reading(45, 9);
SELECT create_usage_from_reading(46, 9);
SELECT create_usage_from_reading(47, 9);
SELECT create_usage_from_reading(48, 9);


-- ─── KAMAL COMMERCIAL ELECTRICITY PREPAID (account=2) ─────────
-- 6 months: Oct 2025 → Mar 2026
-- Usage: 385–468 kWh × ৳15.62 peak = ৳6,012–7,310/month
-- Top-up ৳8,500/month for safety + fixed charges.

DO $$
DECLARE
  v_bill_id INTEGER;
  v_method_id INTEGER;
BEGIN
  SELECT method_id INTO v_method_id
  FROM payment_method WHERE consumer_id = 3 AND is_default = TRUE;

  FOR i IN 1..6 LOOP
    v_bill_id := create_prepaid_statement(2, 8500.00);
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    VALUES (v_bill_id, v_method_id, 8500.00, CURRENT_TIMESTAMP, 'Completed');
  END LOOP;
END $$;

-- Approve Kamal's 6 readings (IDs 79..84)
SELECT create_usage_from_reading(79, 9);
SELECT create_usage_from_reading(80, 9);
SELECT create_usage_from_reading(81, 9);
SELECT create_usage_from_reading(82, 9);
SELECT create_usage_from_reading(83, 9);
SELECT create_usage_from_reading(84, 9);


-- ─── MOMENA ELECTRICITY PREPAID (account=3) ─────────────────
-- 6 months: Oct 2025 → Mar 2026
-- Usage: 64–92 kWh × ৳5.26 = ৳336–484/month
-- Top-up ৳650/month.

DO $$
DECLARE
  v_bill_id INTEGER;
  v_method_id INTEGER;
BEGIN
  SELECT method_id INTO v_method_id
  FROM payment_method WHERE consumer_id = 6 AND is_default = TRUE;

  FOR i IN 1..6 LOOP
    v_bill_id := create_prepaid_statement(3, 650.00);
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    VALUES (v_bill_id, v_method_id, 650.00, CURRENT_TIMESTAMP, 'Completed');
  END LOOP;
END $$;

-- Approve Momena's 6 readings (IDs 97..102)
SELECT create_usage_from_reading(97,  9);
SELECT create_usage_from_reading(98,  9);
SELECT create_usage_from_reading(99,  9);
SELECT create_usage_from_reading(100, 9);
SELECT create_usage_from_reading(101, 9);
SELECT create_usage_from_reading(102, 9);


-- ─── TANIA WATER PREPAID (account=4) ────────────────────────
-- 6 months: Oct 2025 → Mar 2026
-- Usage: 8,000–10,200 L × ৳0.01670 = ৳134–170/month
-- Top-up ৳300/month.

DO $$
DECLARE
  v_bill_id INTEGER;
  v_method_id INTEGER;
BEGIN
  SELECT method_id INTO v_method_id
  FROM payment_method WHERE consumer_id = 8 AND is_default = TRUE;

  FOR i IN 1..6 LOOP
    v_bill_id := create_prepaid_statement(4, 300.00);
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    VALUES (v_bill_id, v_method_id, 300.00, CURRENT_TIMESTAMP, 'Completed');
  END LOOP;
END $$;

-- Approve Tania's 6 readings (IDs 109..114)
SELECT create_usage_from_reading(109, 9);
SELECT create_usage_from_reading(110, 9);
SELECT create_usage_from_reading(111, 9);
SELECT create_usage_from_reading(112, 9);
SELECT create_usage_from_reading(113, 9);
SELECT create_usage_from_reading(114, 9);
