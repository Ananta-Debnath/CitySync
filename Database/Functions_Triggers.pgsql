-- Calculate bill amount from use --- DONE
-- Create bill ---DONE
-- Calculate late payment fine
-- Create usage from reading --- DONE

-- TRIGGERS
-- Payment -> Update bill/balance --- DONE
-- Usage -> Update balance -- DONE



-- FUNCTIONS
CREATE OR REPLACE FUNCTION get_address_text(p_address_id INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT CONCAT_WS(', ',
      a.house_num,
      a.street_name,
      a.landmark,        -- NULL will be skipped automatically
      CONCAT(r.region_name, '-', r.postal_code)
    )
    FROM address a
    JOIN region r ON a.region_id = r.region_id
    WHERE a.address_id = p_address_id
  );
END;
$$;




CREATE OR REPLACE FUNCTION get_rate(p_tariff_id INTEGER, p_slab_num INTEGER)
RETURNS NUMERIC(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rate NUMERIC(10, 2);
BEGIN
    SELECT rate_per_unit INTO v_rate
    FROM tariff_slab
    WHERE tariff_id = p_tariff_id AND slab_num = p_slab_num;

    RETURN v_rate;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_energy_amount(
    p_connection_id INTEGER,
    p_start_date DATE,
    p_end_date DATE
) RETURNS NUMERIC(10, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC(10, 2);
BEGIN
    SELECT COALESCE(SUM(u.unit_used * get_rate(u.tariff_id, u.slab_num)), 0)
    INTO v_total
    FROM usage u
    JOIN utility_connection c ON u.meter_id = c.meter_id
    WHERE c.connection_id = p_connection_id
      AND u.time_to >= p_start_date::TIMESTAMP
      AND u.time_to < (p_end_date::TIMESTAMP + INTERVAL '1 day');

    RETURN v_total;
END
$$;

CREATE OR REPLACE FUNCTION create_usage_from_reading(p_reading_id INTEGER, p_employee_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_meter_id INTEGER;
    v_time_from TIMESTAMP;
    v_time_to TIMESTAMP;
    v_unit_used NUMERIC(10, 2);
    v_tariff_id INTEGER;
    v_slab_num INTEGER;
BEGIN
    IF (SELECT approved_by FROM meter_reading WHERE reading_id = p_reading_id) IS NOT NULL THEN
        RAISE EXCEPTION 'Meter reading has already been approved';
    END IF;

    UPDATE meter_reading
    SET approved_by = p_employee_id
    WHERE reading_id = p_reading_id;

    SELECT meter_id, time_from, time_to, unit_used, tariff_id, slab_num
    INTO v_meter_id, v_time_from, v_time_to, v_unit_used, v_tariff_id, v_slab_num
    FROM meter_reading
    WHERE reading_id = p_reading_id;

    INSERT INTO usage (meter_id, tariff_id, slab_num, time_from, time_to, unit_used)
    VALUES (v_meter_id, v_tariff_id, v_slab_num, v_time_from, v_time_to, v_unit_used);
END;
$$;

CREATE OR REPLACE FUNCTION add_payment_method(
  p_method_name text,
  p_consumer_id integer DEFAULT NULL,
  p_bank_name text DEFAULT NULL,
  p_account_num text DEFAULT NULL,
  p_provider_name text DEFAULT NULL,
  p_phone_num text DEFAULT NULL,
  p_google_account_email text DEFAULT NULL,
  p_set_default boolean DEFAULT FALSE
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_method_id integer;
  v_bank_id integer;
  v_provider_id integer;
BEGIN
  IF p_set_default THEN
    UPDATE payment_method SET is_default = FALSE WHERE consumer_id = p_consumer_id;
  END IF;

  INSERT INTO payment_method(method_name, consumer_id, is_default)
    VALUES (p_method_name, p_consumer_id, COALESCE(p_set_default, FALSE))
    RETURNING method_id INTO v_method_id;

  IF p_method_name = 'bank' THEN
    SELECT bank_id INTO v_bank_id FROM bank_name WHERE bank_name = p_bank_name;
    IF v_bank_id IS NULL THEN
      RAISE EXCEPTION 'Bank not found: %', p_bank_name USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO bank(method_id, bank_id, account_num) VALUES (v_method_id, v_bank_id, p_account_num);

  ELSIF p_method_name = 'mobile_banking' THEN
    SELECT provider_id INTO v_provider_id FROM mobile_banking_provider WHERE provider_name = p_provider_name;
    IF v_provider_id IS NULL THEN
      RAISE EXCEPTION 'Provider not found: %', p_provider_name USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO mobile_banking(method_id, provider_id, phone_num) VALUES (v_method_id, v_provider_id, p_phone_num);

  ELSIF p_method_name = 'google_pay' THEN
    INSERT INTO google_pay(method_id, email, phone_num) VALUES (v_method_id, p_google_account_email, p_phone_num);

  ELSE
    RAISE EXCEPTION 'Invalid method_name: %', p_method_name USING ERRCODE = 'P0003';
  END IF;

  RETURN v_method_id;
EXCEPTION
  WHEN others THEN
    -- bubble up so app can map errors
    RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION create_prepaid_statement(p_account_id INTEGER, p_amount NUMERIC(10, 2))
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_vat_rate NUMERIC(5,2);
  v_is_vat_exempt BOOLEAN;
  v_vat_amount NUMERIC(10,2);
  v_amount_remaining NUMERIC(10,2) := COALESCE(p_amount, 0);
  v_connection_id INTEGER;
  v_bill_document_id INTEGER;
  v_rec RECORD;
BEGIN
  IF v_amount_remaining <= 0 THEN
    RAISE EXCEPTION 'p_amount must be greater than zero';
  END IF;

  -- Resolve connection for this prepaid account
  SELECT connection_id INTO v_connection_id
  FROM prepaid_account
  WHERE prepaid_account_id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prepaid account not found: %', p_account_id;
  END IF;

  SELECT vat_rate, is_vat_exempt INTO v_vat_rate, v_is_vat_exempt
  FROM utility_connection uc
  JOIN tariff t ON t.tariff_id = uc.tariff_id
  WHERE uc.connection_id = v_connection_id;

  IF v_is_vat_exempt THEN
    v_vat_rate := 0;
  END IF;

  v_vat_amount := ROUND((v_vat_rate / 100) * v_amount_remaining, 2);

  -- Create a placeholder bill_document for this prepaid recharge. The detailed bill
  -- (if needed) can be created/updated later; we need a bill id to link applied fixed charges.
  INSERT INTO bill_document(connection_id, bill_type, energy_amount, subtotal, vat_rate, vat_amount, total_amount, bill_status)
  VALUES (v_connection_id, 'PREPAID', 0, p_amount - v_vat_amount, v_vat_rate, v_vat_amount, p_amount, 'CANCELLED')
  RETURNING bill_document_id INTO v_bill_document_id;

	-- ADD VAT
  v_amount_remaining := v_amount_remaining - v_vat_amount;

  -- Create prepaid statement entry (token can be NULL for now)
  INSERT INTO prepaid_statement(bill_document_id)
  VALUES (v_bill_document_id);

  -- Apply fixed charges owed oldest-first (ordered by timeframe). Lock rows for update.
  FOR v_rec IN
    SELECT fixed_charge_id, amount, timeframe
    FROM fixed_charge_owed
    WHERE prepaid_account_id = p_account_id
      AND amount > 0
    ORDER BY timeframe
    FOR UPDATE
  LOOP
    IF v_amount_remaining <= 0 THEN
      EXIT;
    END IF;

    IF v_amount_remaining >= v_rec.amount THEN
      -- Fully pay this owed fixed charge: record as applied and remove from owed
      BEGIN
        INSERT INTO fixed_charge_applied(fixed_charge_id, bill_document_id, timeframe, amount)
        VALUES (v_rec.fixed_charge_id, v_bill_document_id, v_rec.timeframe, v_rec.amount);
      EXCEPTION WHEN unique_violation THEN
        -- already applied for this bill; ignore
      END;

      v_amount_remaining := v_amount_remaining - v_rec.amount;
    ELSE
      -- Partially pay this owed fixed charge: record as applied and keep remainder
      BEGIN
        -- For partial payment, record only the amount actually applied
        INSERT INTO fixed_charge_applied(fixed_charge_id, bill_document_id, timeframe, amount)
        VALUES (v_rec.fixed_charge_id, v_bill_document_id, v_rec.timeframe, v_amount_remaining);
      EXCEPTION WHEN unique_violation THEN
      END;

      v_amount_remaining := 0;
      EXIT;
    END IF;
  END LOOP;
	
	UPDATE bill_document
	SET energy_amount = v_amount_remaining,
	    total_amount = p_amount
	WHERE bill_document_id = v_bill_document_id;

  RETURN v_bill_document_id;
END
$$;

CREATE OR REPLACE FUNCTION get_region_utility_connection_count(p_region_id INTEGER, p_utility_id INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN (
        SELECT COUNT(uc.connection_id)
        FROM utility_connection uc
        JOIN meter m ON uc.meter_id = m.meter_id
        JOIN address a ON m.address_id = a.address_id
        JOIN tariff t ON uc.tariff_id = t.tariff_id
        WHERE a.region_id = p_region_id
          AND t.utility_id = p_utility_id
    );
END;
$$;


-- TRIGGERS
-- AFTER INSERT trigger to create prepaid account for new prepaid connection
CREATE OR REPLACE FUNCTION create_prepaid_account_after_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment_type text;

BEGIN
    -- Check if the new connection is prepaid
    SELECT payment_type INTO v_payment_type
    FROM utility_connection
    WHERE connection_id = NEW.connection_id;

    IF v_payment_type ILIKE 'PREPAID' THEN
        -- Create a prepaid account with an initial balance of 0
        INSERT INTO prepaid_account (connection_id, balance)
        VALUES (NEW.connection_id, 0);
    END IF;

    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS create_prepaid_account_after_insert_trg ON utility_connection;
CREATE TRIGGER create_prepaid_account_after_insert_trg
AFTER INSERT ON utility_connection
FOR EACH ROW
EXECUTE FUNCTION create_prepaid_account_after_insert();

-- -- TRIGGER to delete fixed_charge_owed when amount is fully paid
-- CREATE OR REPLACE FUNCTION remove_fully_paid_fixed_charge() RETURNS trigger
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     DELETE FROM fixed_charge_owed
--     WHERE fixed_charge_id = NEW.fixed_charge_id
--       AND prepaid_account_id = NEW.prepaid_account_id
--       AND timeframe = NEW.timeframe;

--     RETURN NEW;
-- END;
-- $$;

-- -- DROP TRIGGER IF EXISTS remove_fully_paid_fixed_charge_trg ON fixed_charge_owed;
-- CREATE TRIGGER remove_fully_paid_fixed_charge_trg
-- AFTER UPDATE OF amount ON fixed_charge_owed
-- FOR EACH ROW
-- WHEN (NEW.amount <= 0)
-- EXECUTE FUNCTION remove_fully_paid_fixed_charge();


-- BEFORE INSERT trigger to update balance for prepaid transactions and suspend connection if balance goes negative.
CREATE OR REPLACE FUNCTION update_balance_for_transaction() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_balance NUMERIC(10, 2);
    v_connection_id INTEGER;
    v_meter_id INTEGER;
BEGIN
    IF NEW.transaction_type ILIKE 'DEBIT' THEN
        UPDATE prepaid_account
        SET balance = balance - NEW.transaction_amount
        WHERE prepaid_account_id = NEW.prepaid_account_id
        RETURNING balance INTO v_balance;
    ELSIF NEW.transaction_type ILIKE 'CREDIT' THEN
        UPDATE prepaid_account
        SET balance = balance + NEW.transaction_amount
        WHERE prepaid_account_id = NEW.prepaid_account_id
        RETURNING balance INTO v_balance;
    END IF;

    NEW.balance_after := v_balance;

    -- Get the connection_id and meter_id for the transaction
    SELECT c.connection_id, c.meter_id INTO v_connection_id, v_meter_id
    FROM prepaid_account p
    JOIN utility_connection c ON p.connection_id = c.connection_id
    WHERE p.prepaid_account_id = NEW.prepaid_account_id;

    IF v_balance <= 0 THEN
        UPDATE utility_connection
        SET connection_status = 'Suspended'
        WHERE connection_id = v_connection_id;

        UPDATE meter
        SET is_active = FALSE
        WHERE meter_id = v_meter_id;
    ELSE
        UPDATE utility_connection
        SET connection_status = 'Active'
        WHERE connection_id = v_connection_id;

        UPDATE meter
        SET is_active = TRUE
        WHERE meter_id = v_meter_id;
    END IF;

    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS update_balance_for_transaction_trg ON balance_transaction;
CREATE TRIGGER update_balance_for_transaction_trg
BEFORE INSERT ON balance_transaction
FOR EACH ROW
EXECUTE FUNCTION update_balance_for_transaction();


-- BEFORE INSERT trigger to assign a per-meter `usage_id` based on `time_to`.
CREATE OR REPLACE FUNCTION usage_before_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- derive usage id from time_to (assumes time_to is NOT NULL)
    NEW.usage_id := to_char(NEW.time_to, 'YYYYMMDDHH24MISS')::BIGINT;
    NEW.usage_id := NEW.usage_id + (NEW.slab_num * 100000000000000); -- Add slab_num to ensure uniqueness across slabs
    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS usage_before_insert_trg ON usage;
CREATE TRIGGER usage_before_insert_trg
BEFORE INSERT ON usage
FOR EACH ROW
EXECUTE FUNCTION usage_before_insert();


-- AFTER INSERT trigger to log transactions for prepaid accounts.
CREATE OR REPLACE FUNCTION usage_after_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	v_connection_id integer;
	v_payment_type text;
	v_prepaid_account_id integer;
	v_amount numeric(10, 2);
BEGIN
	-- Find the connection
	SELECT c.connection_id, c.payment_type INTO v_connection_id, v_payment_type
	FROM utility_connection c
	WHERE c.meter_id = NEW.meter_id;

	IF NOT FOUND OR v_payment_type NOT ILIKE 'PREPAID' THEN
		-- Can't resolve connection or not prepaid; do nothing
		RETURN NEW;
	END IF;

    SELECT p.prepaid_account_id INTO v_prepaid_account_id
    FROM PREPAID_ACCOUNT p
    WHERE p.connection_id = v_connection_id;

    IF NOT FOUND THEN
        -- No prepaid account found, account is postpaid; do nothing
        RETURN NEW;
    END IF;

    v_amount := NEW.unit_used * get_rate(NEW.tariff_id, NEW.slab_num);

    INSERT INTO balance_transaction (meter_id, usage_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time)
    VALUES (NEW.meter_id, NEW.usage_id, v_prepaid_account_id, v_amount, 'DEBIT', CURRENT_TIMESTAMP);

	RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS usage_after_insert_trg ON usage;
CREATE TRIGGER usage_after_insert_trg
AFTER INSERT ON usage
FOR EACH ROW
EXECUTE FUNCTION usage_after_insert();


-- AFTER INSERT trigger to update bill and balance for payments.
CREATE OR REPLACE FUNCTION payment_after_insert() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_prepaid_account_id INTEGER;
    v_connection_id INTEGER;
    v_bill_type VARCHAR(20);
	v_energy_amount NUMERIC(10, 2);
  	v_rec RECORD;
BEGIN
    UPDATE bill_document
    SET bill_status = 'PAID'
    WHERE bill_document_id = NEW.bill_document_id
    RETURNING connection_id, bill_type, energy_amount INTO v_connection_id, v_bill_type, v_energy_amount;

    -- For prepaid payments, log transaction
    IF v_bill_type ILIKE 'PREPAID' THEN
        SELECT prepaid_account_id INTO v_prepaid_account_id
        FROM prepaid_account
        WHERE connection_id = v_connection_id;

        INSERT INTO balance_transaction (bill_document_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time)
        VALUES (NEW.bill_document_id, v_prepaid_account_id, v_energy_amount, 'CREDIT', CURRENT_TIMESTAMP);

		FOR v_rec IN
			SELECT fixed_charge_id, amount, timeframe
			FROM fixed_charge_applied
			WHERE bill_document_id = NEW.bill_document_id
			FOR UPDATE
		LOOP
			UPDATE fixed_charge_owed
			SET amount = amount - v_rec.amount
			WHERE fixed_charge_id = v_rec.fixed_charge_id
			  AND prepaid_account_id = v_prepaid_account_id
			  AND timeframe = v_rec.timeframe;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS payment_after_insert_trg ON payment;
CREATE TRIGGER payment_after_insert_trg
AFTER INSERT ON payment
FOR EACH ROW
EXECUTE FUNCTION payment_after_insert();




------------PROCEDURES----------

CREATE OR REPLACE PROCEDURE create_postpaid_bill_for_connection(
  p_connection_id INTEGER,
  p_period_start DATE,
  p_period_end DATE DEFAULT CURRENT_DATE,
  p_due_in_days INTEGER DEFAULT 15,
  p_run_date DATE DEFAULT CURRENT_DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_period_end_exclusive TIMESTAMP;
  v_bill_generation_date DATE;

  v_meter_id INTEGER;
  v_tariff_id INTEGER;
  v_connection_status TEXT;
  v_payment_type TEXT;

  v_bill_document_id INTEGER;

  v_unit_consumed NUMERIC(10, 2);
  v_energy_amount bill_document.energy_amount%TYPE;
  v_fixed_charge_total bill_document.energy_amount%TYPE := 0;
  v_subtotal bill_document.subtotal%TYPE;
  v_vat_rate bill_document.vat_rate%TYPE;
  v_is_vat_exempt BOOLEAN;
  v_vat_amount bill_document.vat_amount%TYPE;
  v_total_amount bill_document.total_amount%TYPE;

  v_fc RECORD;

BEGIN
  IF p_due_in_days < 0 THEN
    RAISE EXCEPTION 'p_due_in_days must be >= 0. Got: %', p_due_in_days;
  END IF;

  SELECT uc.meter_id, uc.tariff_id, uc.connection_status, uc.payment_type
  INTO v_meter_id, v_tariff_id, v_connection_status, v_payment_type
  FROM utility_connection uc
  WHERE uc.connection_id = p_connection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection not found: %', p_connection_id;
  END IF;

  IF v_payment_type NOT ILIKE 'POSTPAID' THEN
    RAISE EXCEPTION 'Connection % is not postpaid', p_connection_id;
  END IF;

  IF v_connection_status NOT ILIKE 'ACTIVE' THEN
    RAISE EXCEPTION 'Connection % is not active', p_connection_id;
  END IF;

  v_bill_generation_date := p_run_date;
  -- v_period_start := (date_trunc('month', p_run_date) - INTERVAL '1 month')::DATE;
  -- v_period_end := (date_trunc('month', p_run_date) - INTERVAL '1 day')::DATE;
  v_period_end_exclusive := p_period_end + INTERVAL '1 day';

  -- Skip if bill already exists for this connection and period.
  IF EXISTS (
    SELECT 1
    FROM bill_document bd
    JOIN bill_postpaid bp ON bp.bill_document_id = bd.bill_document_id
    WHERE bd.connection_id = p_connection_id
      AND bp.bill_period_end >= p_period_start
      AND bp.bill_period_start <= p_period_end
  ) THEN
    -- RAISE EXCEPTION 'Bill already exists for connection % and period % to %', p_connection_id, p_period_start, p_period_end;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(u.unit_used), 0)
  INTO v_unit_consumed
  FROM usage u
  WHERE u.meter_id = v_meter_id
    AND u.time_to >= p_period_start::TIMESTAMP
    AND u.time_to < v_period_end_exclusive;

  v_energy_amount := calculate_energy_amount(p_connection_id, p_period_start, p_period_end);

  -- SELECT COALESCE(SUM(fc.charge_amount), 0)
  -- INTO v_fixed_charge_total
  -- FROM fixed_charge fc
  -- WHERE fc.tariff_id = v_tariff_id
  --   AND fc.charge_frequency ILIKE 'MONTHLY';

  SELECT COALESCE(t.vat_rate, 0), COALESCE(t.is_vat_exempt, FALSE)
  INTO v_vat_rate, v_is_vat_exempt
  FROM tariff t
  WHERE t.tariff_id = v_tariff_id;

  IF v_is_vat_exempt THEN
    v_vat_rate := 0;
  END IF;

  -- Early creation for reference
  INSERT INTO bill_document (connection_id, bill_type, bill_generation_date, energy_amount, subtotal,
                             vat_rate, vat_amount, is_vat_exempt, total_amount, bill_status)
  VALUES (p_connection_id, 'POSTPAID', v_bill_generation_date, v_energy_amount, 0,
          v_vat_rate, 0, v_is_vat_exempt, 0, 'UNPAID')
  RETURNING bill_document_id INTO v_bill_document_id;

  FOR v_fc IN (SELECT * FROM fixed_charge WHERE tariff_id = v_tariff_id AND is_mandatory AND charge_frequency ILIKE 'MONTHLY') LOOP
    v_fixed_charge_total := v_fixed_charge_total + v_fc.charge_amount;
    INSERT INTO fixed_charge_applied(fixed_charge_id, bill_document_id, amount, timeframe)
    VALUES(v_fc.fixed_charge_id, v_bill_document_id, v_fc.charge_amount, to_char(p_period_start, 'Mon YYYY'));
  END LOOP;

  v_subtotal := ROUND(v_energy_amount + v_fixed_charge_total, 2);
  v_vat_amount := ROUND((v_subtotal * v_vat_rate) / 100.0, 2);
  v_total_amount := ROUND(v_subtotal + v_vat_amount, 2);
  
  UPDATE bill_document
  SET subtotal = v_subtotal,
      vat_amount = v_vat_amount,
      total_amount = v_total_amount
  WHERE bill_document_id = v_bill_document_id;

  INSERT INTO bill_postpaid (bill_document_id, unit_consumed, bill_period_start, bill_period_end,
                             due_date, remarks)
  VALUES (v_bill_document_id, v_unit_consumed, p_period_start, p_period_end,
          v_bill_generation_date + make_interval(days => p_due_in_days), 'Auto-generated monthly postpaid bill');
END;
$$;

CREATE OR REPLACE PROCEDURE create_monthly_bills(
  p_month DATE DEFAULT date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',
  p_run_date DATE DEFAULT CURRENT_DATE,
  p_due_in_days INTEGER DEFAULT 15
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_connection RECORD;
BEGIN
  IF date_trunc('month', p_month)::DATE <> p_month THEN
    RAISE EXCEPTION 'p_month must be the first day of a month. Got: %', p_month;
  END IF;

  IF p_due_in_days < 0 THEN
    RAISE EXCEPTION 'p_due_in_days must be >= 0. Got: %', p_due_in_days;
  END IF;

  FOR v_connection IN (SELECT uc.connection_id, uc.payment_type FROM utility_connection uc
                       WHERE uc.connection_status ILIKE 'ACTIVE')
  LOOP
    BEGIN
      IF v_connection.payment_type ILIKE 'POSTPAID' THEN
        CALL create_postpaid_bill_for_connection(
          v_connection.connection_id,
          p_month,
          (p_month + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
          p_due_in_days,
          p_run_date
        );
      ELSIF v_connection.payment_type ILIKE 'PREPAID' THEN
        -- add the fixed charges
        INSERT INTO fixed_charge_owed (prepaid_account_id, fixed_charge_id, amount, timeframe)
        SELECT pa.prepaid_account_id, fc.fixed_charge_id, fc.charge_amount, to_char(p_month + INTERVAL '1 month', 'Mon YYYY')
        FROM prepaid_account pa
        JOIN utility_connection uc ON pa.connection_id = uc.connection_id
        JOIN tariff t ON uc.tariff_id = t.tariff_id
        JOIN fixed_charge fc ON t.tariff_id = fc.tariff_id
        WHERE fc.is_mandatory = TRUE AND fc.charge_frequency ILIKE 'MONTHLY'
          AND uc.connection_id = v_connection.connection_id;
      ELSE
        RAISE EXCEPTION 'Unknown payment type for connection %: %', v_connection.connection_id, v_connection.payment_type;
      END IF;
    
    EXCEPTION WHEN OTHERS THEN
      -- Log the error and continue with the next connection
      INSERT INTO bill_error_log (connection_id, bill_month, error_message, error_time)
      VALUES (v_connection.connection_id, to_char(p_month, 'Mon YYYY'), SQLERRM, CURRENT_TIMESTAMP);

    END;
  END LOOP;
END;
$$;



--------VIEWS----------
--  Create the field worker stats view used by auto-assignment
CREATE OR REPLACE VIEW field_worker_stats AS
SELECT
    fw.person_id,
    fw.assigned_region_id,
    p.first_name,
    p.last_name,
    COUNT(CASE WHEN c.status IN ('Pending', 'In Progress') THEN 1 END) AS active_assignments,
    COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) AS total_resolved,
    AVG(CASE
        WHEN c.status = 'Resolved' AND c.assignment_date IS NOT NULL AND c.resolution_date IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c.resolution_date::timestamp - c.assignment_date::timestamp)) / 86400
    END) AS avg_resolution_days,
    ROUND(
        100.0 * COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END) /
        NULLIF(COUNT(c.complaint_id), 0),
        2
    ) AS resolution_rate
FROM field_worker fw
JOIN person p ON fw.person_id = p.person_id
LEFT JOIN complaint c ON fw.person_id = c.assigned_to
GROUP BY fw.person_id, fw.assigned_region_id, p.first_name, p.last_name;