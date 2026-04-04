-- =============================================================
-- FILE: 07_bills_payments.sql
-- PURPOSE: Generate postpaid bills and record payments.
--
-- DATE RANGE: Apr 2024 → Mar 2026 for Rahim (24 months)
--             Oct 2025 → Mar 2026 for other postpaid consumers
--
-- BILL STATUS DESIGN for Rahim:
--   PAID    → Apr 2024 – Sep 2025 (18 months, all paid on time)
--   OVERDUE → Oct 2025 & Nov 2025 electricity + gas (missed two months)
--   UNPAID  → Dec 2025, Jan 2026, Feb 2026 (recent, not yet paid)
--   Note: Mar 2026 bill not generated yet (current month, no full usage)
--
-- Other consumers:
--   Oct–Dec 2025 → PAID
--   Jan–Feb 2026 → UNPAID
--   Mar 2026     → just generated, UNPAID
-- =============================================================


-- ─── RAHIM ELECTRICITY (connection_id=1) — 24 months ─────────
CALL create_postpaid_bill_for_connection(1,'2024-03-01','2024-03-31',15,'2024-04-05');
CALL create_postpaid_bill_for_connection(1,'2024-04-01','2024-04-30',15,'2024-05-05');
CALL create_postpaid_bill_for_connection(1,'2024-05-01','2024-05-31',15,'2024-06-05');
CALL create_postpaid_bill_for_connection(1,'2024-06-01','2024-06-30',15,'2024-07-05');
CALL create_postpaid_bill_for_connection(1,'2024-07-01','2024-07-31',15,'2024-08-05');
CALL create_postpaid_bill_for_connection(1,'2024-08-01','2024-08-31',15,'2024-09-05');
CALL create_postpaid_bill_for_connection(1,'2024-09-01','2024-09-30',15,'2024-10-05');
CALL create_postpaid_bill_for_connection(1,'2024-10-01','2024-10-31',15,'2024-11-05');
CALL create_postpaid_bill_for_connection(1,'2024-11-01','2024-11-30',15,'2024-12-05');
CALL create_postpaid_bill_for_connection(1,'2024-12-01','2024-12-31',15,'2025-01-05');
CALL create_postpaid_bill_for_connection(1,'2025-01-01','2025-01-31',15,'2025-02-05');
CALL create_postpaid_bill_for_connection(1,'2025-02-01','2025-02-28',15,'2025-03-05');
CALL create_postpaid_bill_for_connection(1,'2025-03-01','2025-03-31',15,'2025-04-05');
CALL create_postpaid_bill_for_connection(1,'2025-04-01','2025-04-30',15,'2025-05-05');
CALL create_postpaid_bill_for_connection(1,'2025-05-01','2025-05-31',15,'2025-06-05');
CALL create_postpaid_bill_for_connection(1,'2025-06-01','2025-06-30',15,'2025-07-05');
CALL create_postpaid_bill_for_connection(1,'2025-07-01','2025-07-31',15,'2025-08-05');
CALL create_postpaid_bill_for_connection(1,'2025-08-01','2025-08-31',15,'2025-09-05');
CALL create_postpaid_bill_for_connection(1,'2025-09-01','2025-09-30',15,'2025-10-05');
-- OVERDUE: Oct + Nov 2025 (generated but not paid below)
CALL create_postpaid_bill_for_connection(1,'2025-10-01','2025-10-31',15,'2025-11-05');
CALL create_postpaid_bill_for_connection(1,'2025-11-01','2025-11-30',15,'2025-12-05');
-- UNPAID: Dec 2025 → Feb 2026
CALL create_postpaid_bill_for_connection(1,'2025-12-01','2025-12-31',15,'2026-01-05');
CALL create_postpaid_bill_for_connection(1,'2026-01-01','2026-01-31',15,'2026-02-05');
CALL create_postpaid_bill_for_connection(1,'2026-02-01','2026-02-28',15,'2026-03-05');


-- ─── RAHIM GAS (connection_id=3) — 24 months ─────────────────
CALL create_postpaid_bill_for_connection(3,'2024-03-01','2024-03-31',15,'2024-04-05');
CALL create_postpaid_bill_for_connection(3,'2024-04-01','2024-04-30',15,'2024-05-05');
CALL create_postpaid_bill_for_connection(3,'2024-05-01','2024-05-31',15,'2024-06-05');
CALL create_postpaid_bill_for_connection(3,'2024-06-01','2024-06-30',15,'2024-07-05');
CALL create_postpaid_bill_for_connection(3,'2024-07-01','2024-07-31',15,'2024-08-05');
CALL create_postpaid_bill_for_connection(3,'2024-08-01','2024-08-31',15,'2024-09-05');
CALL create_postpaid_bill_for_connection(3,'2024-09-01','2024-09-30',15,'2024-10-05');
CALL create_postpaid_bill_for_connection(3,'2024-10-01','2024-10-31',15,'2024-11-05');
CALL create_postpaid_bill_for_connection(3,'2024-11-01','2024-11-30',15,'2024-12-05');
CALL create_postpaid_bill_for_connection(3,'2024-12-01','2024-12-31',15,'2025-01-05');
CALL create_postpaid_bill_for_connection(3,'2025-01-01','2025-01-31',15,'2025-02-05');
CALL create_postpaid_bill_for_connection(3,'2025-02-01','2025-02-28',15,'2025-03-05');
CALL create_postpaid_bill_for_connection(3,'2025-03-01','2025-03-31',15,'2025-04-05');
CALL create_postpaid_bill_for_connection(3,'2025-04-01','2025-04-30',15,'2025-05-05');
CALL create_postpaid_bill_for_connection(3,'2025-05-01','2025-05-31',15,'2025-06-05');
CALL create_postpaid_bill_for_connection(3,'2025-06-01','2025-06-30',15,'2025-07-05');
CALL create_postpaid_bill_for_connection(3,'2025-07-01','2025-07-31',15,'2025-08-05');
CALL create_postpaid_bill_for_connection(3,'2025-08-01','2025-08-31',15,'2025-09-05');
CALL create_postpaid_bill_for_connection(3,'2025-09-01','2025-09-30',15,'2025-10-05');
-- OVERDUE: Oct + Nov 2025
CALL create_postpaid_bill_for_connection(3,'2025-10-01','2025-10-31',15,'2025-11-05');
CALL create_postpaid_bill_for_connection(3,'2025-11-01','2025-11-30',15,'2025-12-05');
-- UNPAID: Dec 2025 → Feb 2026
CALL create_postpaid_bill_for_connection(3,'2025-12-01','2025-12-31',15,'2026-01-05');
CALL create_postpaid_bill_for_connection(3,'2026-01-01','2026-01-31',15,'2026-02-05');
CALL create_postpaid_bill_for_connection(3,'2026-02-01','2026-02-28',15,'2026-03-05');


-- ─── OTHER POSTPAID CONNECTIONS — 6 months ───────────────────
CALL create_postpaid_bill_for_connection(4,'2025-09-01','2025-09-30',15,'2025-10-05');
CALL create_postpaid_bill_for_connection(4,'2025-10-01','2025-10-31',15,'2025-11-05');
CALL create_postpaid_bill_for_connection(4,'2025-11-01','2025-11-30',15,'2025-12-05');
CALL create_postpaid_bill_for_connection(4,'2025-12-01','2025-12-31',15,'2026-01-05');
CALL create_postpaid_bill_for_connection(4,'2026-01-01','2026-01-31',15,'2026-02-05');
CALL create_postpaid_bill_for_connection(4,'2026-02-01','2026-02-28',15,'2026-03-05');

CALL create_postpaid_bill_for_connection(6,'2025-09-01','2025-09-30',15,'2025-10-05');
CALL create_postpaid_bill_for_connection(6,'2025-10-01','2025-10-31',15,'2025-11-05');
CALL create_postpaid_bill_for_connection(6,'2025-11-01','2025-11-30',15,'2025-12-05');
CALL create_postpaid_bill_for_connection(6,'2025-12-01','2025-12-31',15,'2026-01-05');
CALL create_postpaid_bill_for_connection(6,'2026-01-01','2026-01-31',15,'2026-02-05');
CALL create_postpaid_bill_for_connection(6,'2026-02-01','2026-02-28',15,'2026-03-05');

CALL create_postpaid_bill_for_connection(7,'2025-09-01','2025-09-30',15,'2025-10-05');
CALL create_postpaid_bill_for_connection(7,'2025-10-01','2025-10-31',15,'2025-11-05');
CALL create_postpaid_bill_for_connection(7,'2025-11-01','2025-11-30',15,'2025-12-05');
CALL create_postpaid_bill_for_connection(7,'2025-12-01','2025-12-31',15,'2026-01-05');
CALL create_postpaid_bill_for_connection(7,'2026-01-01','2026-01-31',15,'2026-02-05');
CALL create_postpaid_bill_for_connection(7,'2026-02-01','2026-02-28',15,'2026-03-05');

CALL create_postpaid_bill_for_connection(9,'2025-09-01','2025-09-30',15,'2025-10-05');
CALL create_postpaid_bill_for_connection(9,'2025-10-01','2025-10-31',15,'2025-11-05');
CALL create_postpaid_bill_for_connection(9,'2025-11-01','2025-11-30',15,'2025-12-05');
CALL create_postpaid_bill_for_connection(9,'2025-12-01','2025-12-31',15,'2026-01-05');
CALL create_postpaid_bill_for_connection(9,'2026-01-01','2026-01-31',15,'2026-02-05');
CALL create_postpaid_bill_for_connection(9,'2026-02-01','2026-02-28',15,'2026-03-05');


-- ─── PAYMENTS ─────────────────────────────────────────────────
-- RAHIM (connections 1 & 3):
--   Pay: Apr 2024 – Sep 2025 (18 months each) → PAID
--   Skip: Oct 2025 & Nov 2025                  → OVERDUE
--   Skip: Dec 2025, Jan 2026, Feb 2026          → UNPAID
--
-- OTHER CONSUMERS:
--   Pay: Oct–Dec 2025 → PAID
--   Skip: Jan–Mar 2026 → UNPAID

DO $$
DECLARE
  v_bill_id INTEGER;
  v_method_id INTEGER;
BEGIN

  -- ── Rahim Electricity (connection 1): pay Apr 2024 – Sep 2025
  FOR v_bill_id IN
    SELECT bd.bill_document_id
    FROM bill_document bd
    JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
    WHERE bd.connection_id = 1
      AND bd.bill_status = 'UNPAID'
      AND bp.bill_period_start < '2025-10-01'
    ORDER BY bp.bill_period_start
  LOOP
    SELECT method_id INTO v_method_id
    FROM payment_method WHERE consumer_id = 1 AND is_default = TRUE;
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    SELECT v_bill_id, v_method_id, total_amount,
           bill_generation_date + INTERVAL '5 days', 'Completed'
    FROM bill_document WHERE bill_document_id = v_bill_id;
  END LOOP;

  -- ── Rahim Gas (connection 3): pay Apr 2024 – Sep 2025
  FOR v_bill_id IN
    SELECT bd.bill_document_id
    FROM bill_document bd
    JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
    WHERE bd.connection_id = 3
      AND bd.bill_status = 'UNPAID'
      AND bp.bill_period_start < '2025-10-01'
    ORDER BY bp.bill_period_start
  LOOP
    SELECT method_id INTO v_method_id
    FROM payment_method WHERE consumer_id = 1 AND is_default = TRUE;
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    SELECT v_bill_id, v_method_id, total_amount,
           bill_generation_date + INTERVAL '5 days', 'Completed'
    FROM bill_document WHERE bill_document_id = v_bill_id;
  END LOOP;

  -- ── Farida (connection 4): pay Oct–Dec 2025
  FOR v_bill_id IN
    SELECT bd.bill_document_id
    FROM bill_document bd
    JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
    WHERE bd.connection_id = 4
      AND bd.bill_status = 'UNPAID'
      AND bp.bill_period_start < '2026-01-01'
    ORDER BY bp.bill_period_start
  LOOP
    SELECT method_id INTO v_method_id
    FROM payment_method WHERE consumer_id = 2 AND is_default = TRUE;
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    SELECT v_bill_id, v_method_id, total_amount,
           bill_generation_date + INTERVAL '7 days', 'Completed'
    FROM bill_document WHERE bill_document_id = v_bill_id;
  END LOOP;

  -- ── Nasreen (connection 6): pay Oct–Dec 2025
  FOR v_bill_id IN
    SELECT bd.bill_document_id
    FROM bill_document bd
    JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
    WHERE bd.connection_id = 6
      AND bd.bill_status = 'UNPAID'
      AND bp.bill_period_start < '2026-01-01'
    ORDER BY bp.bill_period_start
  LOOP
    SELECT method_id INTO v_method_id
    FROM payment_method WHERE consumer_id = 4 AND is_default = TRUE;
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    SELECT v_bill_id, v_method_id, total_amount,
           bill_generation_date + INTERVAL '10 days', 'Completed'
    FROM bill_document WHERE bill_document_id = v_bill_id;
  END LOOP;

  -- ── Shahidul (connection 7): pay all 6 months
  FOR v_bill_id IN
    SELECT bd.bill_document_id
    FROM bill_document bd
    WHERE bd.connection_id = 7 AND bd.bill_status = 'UNPAID'
    ORDER BY bd.bill_generation_date
  LOOP
    SELECT method_id INTO v_method_id
    FROM payment_method WHERE consumer_id = 5 AND is_default = TRUE;
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    SELECT v_bill_id, v_method_id, total_amount,
           bill_generation_date + INTERVAL '6 days', 'Completed'
    FROM bill_document WHERE bill_document_id = v_bill_id;
  END LOOP;

  -- ── Rafiqul Commercial (connection 9): pay Oct–Dec 2025
  FOR v_bill_id IN
    SELECT bd.bill_document_id
    FROM bill_document bd
    JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
    WHERE bd.connection_id = 9
      AND bd.bill_status = 'UNPAID'
      AND bp.bill_period_start < '2026-01-01'
    ORDER BY bp.bill_period_start
  LOOP
    SELECT method_id INTO v_method_id
    FROM payment_method WHERE consumer_id = 7 AND is_default = TRUE;
    INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
    SELECT v_bill_id, v_method_id, total_amount,
           bill_generation_date + INTERVAL '8 days', 'Completed'
    FROM bill_document WHERE bill_document_id = v_bill_id;
  END LOOP;

END $$;
