--
-- PostgreSQL database dump
--

\restrict UbRrngN5xK704iQxPLiVdKFkfgc9iawGHbl4FPKCBg74YZ79X7so12i88ewxQcV

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

-- Started on 2026-03-27 21:27:31

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 291 (class 1255 OID 27055)
-- Name: add_payment_method(text, integer, text, text, text, text, text, boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_payment_method(p_method_name text, p_consumer_id integer DEFAULT NULL::integer, p_bank_name text DEFAULT NULL::text, p_account_num text DEFAULT NULL::text, p_provider_name text DEFAULT NULL::text, p_phone_num text DEFAULT NULL::text, p_google_account_email text DEFAULT NULL::text, p_set_default boolean DEFAULT false) RETURNS integer
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


ALTER FUNCTION public.add_payment_method(p_method_name text, p_consumer_id integer, p_bank_name text, p_account_num text, p_provider_name text, p_phone_num text, p_google_account_email text, p_set_default boolean) OWNER TO postgres;

--
-- TOC entry 273 (class 1255 OID 27040)
-- Name: calculate_energy_amount(integer, date, date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_energy_amount(p_connection_id integer, p_start_date date, p_end_date date) RETURNS numeric
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
      AND u.time_to BETWEEN p_start_date AND p_end_date;

    RETURN v_total;
END
$$;


ALTER FUNCTION public.calculate_energy_amount(p_connection_id integer, p_start_date date, p_end_date date) OWNER TO postgres;

--
-- TOC entry 276 (class 1255 OID 27042)
-- Name: create_prepaid_account_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_prepaid_account_after_insert() RETURNS trigger
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


ALTER FUNCTION public.create_prepaid_account_after_insert() OWNER TO postgres;

--
-- TOC entry 293 (class 1255 OID 27086)
-- Name: create_prepaid_statement(integer, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_prepaid_statement(p_account_id integer, p_amount numeric) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
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

  -- Create a placeholder bill_document for this prepaid recharge. The detailed bill
  -- (if needed) can be created/updated later; we need a bill id to link applied fixed charges.
  INSERT INTO bill_document(connection_id, bill_type, unit_consumed, energy_amount, total_amount, bill_status)
  VALUES (v_connection_id, 'PREPAID', 0, 0, p_amount, 'CANCELLED')
  RETURNING bill_document_id INTO v_bill_document_id;

	-- ADD VAT (LATER)

  -- Create prepaid statement entry (token can be NULL for now)
  INSERT INTO prepaid_statement(bill_document_id)
  VALUES (v_bill_document_id);

  -- Apply fixed charges owed oldest-first (ordered by timeframe). Lock rows for update.
  FOR v_rec IN
    SELECT fixed_charge_id, amount, timeframe
    FROM fixed_charge_owed
    WHERE prepaid_account_id = p_account_id
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

      -- Removal will happen after payment completion
      -- DELETE FROM fixed_charge_owed
      -- WHERE fixed_charge_id = v_rec.fixed_charge_id
      --   AND prepaid_account_id = p_account_id
      --   AND timeframe = v_rec.timeframe;

      v_amount_remaining := v_amount_remaining - v_rec.amount;
    ELSE
      -- Partially pay this owed fixed charge: record as applied and keep remainder
      BEGIN
        -- For partial payment, record only the amount actually applied
        INSERT INTO fixed_charge_applied(fixed_charge_id, bill_document_id, timeframe, amount)
        VALUES (v_rec.fixed_charge_id, v_bill_document_id, v_rec.timeframe, v_amount_remaining);
      EXCEPTION WHEN unique_violation THEN
      END;

			-- Removal will happen after payment completion
      -- UPDATE fixed_charge_owed
      -- SET amount = amount - v_amount_remaining
      -- WHERE fixed_charge_id = v_rec.fixed_charge_id
      --   AND prepaid_account_id = p_account_id
      --   AND timeframe = v_rec.timeframe;

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


ALTER FUNCTION public.create_prepaid_statement(p_account_id integer, p_amount numeric) OWNER TO postgres;

--
-- TOC entry 275 (class 1255 OID 27041)
-- Name: create_usage_from_reading(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_usage_from_reading(p_reading_id integer, p_employee_id integer) RETURNS void
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


ALTER FUNCTION public.create_usage_from_reading(p_reading_id integer, p_employee_id integer) OWNER TO postgres;

--
-- TOC entry 274 (class 1255 OID 27121)
-- Name: get_address_text(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_address_text(p_address_id integer) RETURNS text
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


ALTER FUNCTION public.get_address_text(p_address_id integer) OWNER TO postgres;

--
-- TOC entry 271 (class 1255 OID 27039)
-- Name: get_rate(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_rate(p_tariff_id integer, p_slab_num integer) RETURNS numeric
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


ALTER FUNCTION public.get_rate(p_tariff_id integer, p_slab_num integer) OWNER TO postgres;

--
-- TOC entry 292 (class 1255 OID 27050)
-- Name: payment_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.payment_after_insert() RETURNS trigger
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


ALTER FUNCTION public.payment_after_insert() OWNER TO postgres;

--
-- TOC entry 272 (class 1255 OID 27087)
-- Name: remove_fully_paid_fixed_charge(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_fully_paid_fixed_charge() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM fixed_charge_owed
    WHERE fixed_charge_id = NEW.fixed_charge_id
      AND prepaid_account_id = NEW.prepaid_account_id
      AND timeframe = NEW.timeframe;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.remove_fully_paid_fixed_charge() OWNER TO postgres;

--
-- TOC entry 290 (class 1255 OID 27044)
-- Name: update_balance_for_transaction(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_balance_for_transaction() RETURNS trigger
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


ALTER FUNCTION public.update_balance_for_transaction() OWNER TO postgres;

--
-- TOC entry 289 (class 1255 OID 27048)
-- Name: usage_after_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.usage_after_insert() RETURNS trigger
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


ALTER FUNCTION public.usage_after_insert() OWNER TO postgres;

--
-- TOC entry 288 (class 1255 OID 27046)
-- Name: usage_before_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.usage_before_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- derive usage id from time_to (assumes time_to is NOT NULL)
    NEW.usage_id := to_char(NEW.time_to, 'YYYYMMDDHH24MISS')::BIGINT;
    NEW.usage_id := NEW.usage_id + (NEW.slab_num * 100000000000000); -- Add slab_num to ensure uniqueness across slabs
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.usage_before_insert() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 26556)
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    account_id integer NOT NULL,
    person_id integer NOT NULL,
    account_type character varying(20) NOT NULL,
    email character varying(100) NOT NULL,
    password_hashed character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.account OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 26555)
-- Name: account_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_account_id_seq OWNER TO postgres;

--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 221
-- Name: account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_account_id_seq OWNED BY public.account.account_id;


--
-- TOC entry 218 (class 1259 OID 26530)
-- Name: address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address (
    address_id integer NOT NULL,
    region_id integer NOT NULL,
    house_num character varying(20) NOT NULL,
    street_name character varying(50) NOT NULL,
    landmark character varying(50)
);


ALTER TABLE public.address OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 26529)
-- Name: address_address_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.address_address_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.address_address_id_seq OWNER TO postgres;

--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 217
-- Name: address_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.address_address_id_seq OWNED BY public.address.address_id;


--
-- TOC entry 253 (class 1259 OID 26900)
-- Name: balance_transaction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balance_transaction (
    transaction_id integer NOT NULL,
    meter_id integer,
    usage_id bigint,
    bill_document_id integer,
    prepaid_account_id integer NOT NULL,
    transaction_amount numeric(10,2) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    transaction_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    balance_after numeric(10,2) NOT NULL,
    CONSTRAINT balance_transaction_check CHECK ((((meter_id IS NOT NULL) AND (usage_id IS NOT NULL) AND (bill_document_id IS NULL)) OR ((bill_document_id IS NOT NULL) AND (meter_id IS NULL) AND (usage_id IS NULL))))
);


ALTER TABLE public.balance_transaction OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 26899)
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.balance_transaction_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.balance_transaction_transaction_id_seq OWNER TO postgres;

--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 252
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.balance_transaction_transaction_id_seq OWNED BY public.balance_transaction.transaction_id;


--
-- TOC entry 258 (class 1259 OID 26944)
-- Name: bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank (
    method_id integer NOT NULL,
    bank_id integer NOT NULL,
    account_num character varying(30) NOT NULL
);


ALTER TABLE public.bank OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 26938)
-- Name: bank_name; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_name (
    bank_id integer NOT NULL,
    bank_name character varying(50) NOT NULL
);


ALTER TABLE public.bank_name OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 26937)
-- Name: bank_name_bank_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_name_bank_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_name_bank_id_seq OWNER TO postgres;

--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 256
-- Name: bank_name_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_name_bank_id_seq OWNED BY public.bank_name.bank_id;


--
-- TOC entry 247 (class 1259 OID 26824)
-- Name: bill_document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_document (
    bill_document_id integer NOT NULL,
    connection_id integer NOT NULL,
    bill_type character varying(20) NOT NULL,
    bill_generation_date date DEFAULT CURRENT_DATE NOT NULL,
    unit_consumed numeric(10,2) NOT NULL,
    energy_amount numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    bill_status character varying(20) DEFAULT 'UNPAID'::character varying
);


ALTER TABLE public.bill_document OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 26823)
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bill_document_bill_document_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bill_document_bill_document_id_seq OWNER TO postgres;

--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 246
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bill_document_bill_document_id_seq OWNED BY public.bill_document.bill_document_id;


--
-- TOC entry 248 (class 1259 OID 26837)
-- Name: bill_postpaid; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_postpaid (
    bill_document_id integer NOT NULL,
    bill_period_start date NOT NULL,
    bill_period_end date NOT NULL,
    due_date date NOT NULL,
    remarks character varying(100)
);


ALTER TABLE public.bill_postpaid OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 26740)
-- Name: commercial_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.commercial_connection (
    connection_id integer NOT NULL,
    business_name character varying(50),
    operating_hours character varying(30),
    tax_id character varying(30)
);


ALTER TABLE public.commercial_connection OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 27010)
-- Name: complaint; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.complaint (
    complaint_id integer NOT NULL,
    consumer_id integer,
    connection_id integer,
    assigned_by integer,
    assigned_to integer,
    complaint_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    status character varying(20),
    assignment_date date,
    resolution_date date,
    remarks character varying(200)
);


ALTER TABLE public.complaint OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 27009)
-- Name: complaint_complaint_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.complaint_complaint_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.complaint_complaint_id_seq OWNER TO postgres;

--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 265
-- Name: complaint_complaint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.complaint_complaint_id_seq OWNED BY public.complaint.complaint_id;


--
-- TOC entry 270 (class 1259 OID 27090)
-- Name: connection_application; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connection_application (
    application_id integer NOT NULL,
    consumer_id integer NOT NULL,
    reviewed_by integer,
    utility_id integer NOT NULL,
    region_id integer NOT NULL,
    application_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    requested_connection_type character varying(50) NOT NULL,
    address text NOT NULL,
    review_date date,
    approval_date date,
    priority character varying(20) DEFAULT 'Normal'::character varying
);


ALTER TABLE public.connection_application OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 27089)
-- Name: connection_application_application_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.connection_application_application_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.connection_application_application_id_seq OWNER TO postgres;

--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 269
-- Name: connection_application_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.connection_application_application_id_seq OWNED BY public.connection_application.application_id;


--
-- TOC entry 223 (class 1259 OID 26569)
-- Name: consumer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumer (
    person_id integer NOT NULL,
    consumer_type character varying(20) NOT NULL,
    registration_date date DEFAULT CURRENT_DATE
);


ALTER TABLE public.consumer OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 26612)
-- Name: electricity_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.electricity_utility (
    utility_id integer NOT NULL,
    voltage_level character varying(20),
    phase_type character varying(20)
);


ALTER TABLE public.electricity_utility OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 26580)
-- Name: employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee (
    person_id integer NOT NULL,
    role character varying(30) NOT NULL,
    employee_num character varying(20) NOT NULL,
    hire_date date NOT NULL,
    employment_status character varying(20)
);


ALTER TABLE public.employee OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 26590)
-- Name: field_worker; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.field_worker (
    person_id integer NOT NULL,
    assigned_region_id integer,
    expertise character varying(50),
    skillset character varying(100)
);


ALTER TABLE public.field_worker OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 26681)
-- Name: fixed_charge; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge (
    fixed_charge_id integer NOT NULL,
    tariff_id integer NOT NULL,
    charge_name character varying(30),
    charge_amount numeric(10,2) NOT NULL,
    charge_frequency character varying(20) NOT NULL,
    is_mandatory boolean DEFAULT false NOT NULL
);


ALTER TABLE public.fixed_charge OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 27056)
-- Name: fixed_charge_applied; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge_applied (
    fixed_charge_id integer NOT NULL,
    bill_document_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    timeframe character varying(20) NOT NULL
);


ALTER TABLE public.fixed_charge_applied OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 26680)
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fixed_charge_fixed_charge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fixed_charge_fixed_charge_id_seq OWNER TO postgres;

--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 235
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fixed_charge_fixed_charge_id_seq OWNED BY public.fixed_charge.fixed_charge_id;


--
-- TOC entry 268 (class 1259 OID 27071)
-- Name: fixed_charge_owed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fixed_charge_owed (
    fixed_charge_id integer NOT NULL,
    prepaid_account_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    timeframe character varying(20) NOT NULL
);


ALTER TABLE public.fixed_charge_owed OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 26632)
-- Name: gas_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gas_utility (
    utility_id integer NOT NULL,
    gas_type character varying(20),
    pressure_category character varying(20)
);


ALTER TABLE public.gas_utility OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 26981)
-- Name: google_pay; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.google_pay (
    method_id integer NOT NULL,
    email character varying(100) NOT NULL,
    phone_num character varying(15)
);


ALTER TABLE public.google_pay OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 26694)
-- Name: meter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter (
    meter_id integer NOT NULL,
    address_id integer NOT NULL,
    meter_type character varying(20) NOT NULL,
    is_active boolean DEFAULT false NOT NULL
);


ALTER TABLE public.meter OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 26693)
-- Name: meter_meter_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meter_meter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meter_meter_id_seq OWNER TO postgres;

--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 237
-- Name: meter_meter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meter_meter_id_seq OWNED BY public.meter.meter_id;


--
-- TOC entry 244 (class 1259 OID 26773)
-- Name: meter_reading; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meter_reading (
    reading_id integer NOT NULL,
    meter_id integer NOT NULL,
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL,
    approved_by integer,
    field_worker_id integer NOT NULL,
    time_from timestamp without time zone NOT NULL,
    time_to timestamp without time zone NOT NULL,
    units_logged numeric(10,2) NOT NULL,
    reading_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.meter_reading OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 26772)
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meter_reading_reading_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meter_reading_reading_id_seq OWNER TO postgres;

--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 243
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meter_reading_reading_id_seq OWNED BY public.meter_reading.reading_id;


--
-- TOC entry 261 (class 1259 OID 26966)
-- Name: mobile_banking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_banking (
    method_id integer NOT NULL,
    provider_id integer NOT NULL,
    phone_num character varying(15) NOT NULL
);


ALTER TABLE public.mobile_banking OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 26960)
-- Name: mobile_banking_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mobile_banking_provider (
    provider_id integer NOT NULL,
    provider_name character varying(30) NOT NULL
);


ALTER TABLE public.mobile_banking_provider OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 26959)
-- Name: mobile_banking_provider_provider_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mobile_banking_provider_provider_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mobile_banking_provider_provider_id_seq OWNER TO postgres;

--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 259
-- Name: mobile_banking_provider_provider_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mobile_banking_provider_provider_id_seq OWNED BY public.mobile_banking_provider.provider_id;


--
-- TOC entry 264 (class 1259 OID 26992)
-- Name: payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment (
    payment_id integer NOT NULL,
    bill_document_id integer NOT NULL,
    method_id integer NOT NULL,
    payment_amount numeric(10,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20)
);


ALTER TABLE public.payment OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 26924)
-- Name: payment_method; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_method (
    method_id integer NOT NULL,
    consumer_id integer,
    method_name character varying(30),
    is_default boolean DEFAULT false
);


ALTER TABLE public.payment_method OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 26923)
-- Name: payment_method_method_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_method_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_method_method_id_seq OWNER TO postgres;

--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 254
-- Name: payment_method_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_method_method_id_seq OWNED BY public.payment_method.method_id;


--
-- TOC entry 263 (class 1259 OID 26991)
-- Name: payment_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_payment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_payment_id_seq OWNER TO postgres;

--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 263
-- Name: payment_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_payment_id_seq OWNED BY public.payment.payment_id;


--
-- TOC entry 220 (class 1259 OID 26542)
-- Name: person; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.person (
    person_id integer NOT NULL,
    address_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    date_of_birth date NOT NULL,
    gender character varying(10),
    phone_number character varying(15) NOT NULL,
    national_id character varying(10) NOT NULL
);


ALTER TABLE public.person OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 26541)
-- Name: person_person_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.person_person_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.person_person_id_seq OWNER TO postgres;

--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 219
-- Name: person_person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.person_person_id_seq OWNED BY public.person.person_id;


--
-- TOC entry 251 (class 1259 OID 26873)
-- Name: prepaid_account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepaid_account (
    prepaid_account_id integer NOT NULL,
    connection_id integer NOT NULL,
    balance numeric(10,2) NOT NULL
);


ALTER TABLE public.prepaid_account OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 26872)
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prepaid_account_prepaid_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prepaid_account_prepaid_account_id_seq OWNER TO postgres;

--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 250
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prepaid_account_prepaid_account_id_seq OWNED BY public.prepaid_account.prepaid_account_id;


--
-- TOC entry 249 (class 1259 OID 26847)
-- Name: prepaid_statement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prepaid_statement (
    bill_document_id integer NOT NULL,
    prepaid_token character varying(50)
);


ALTER TABLE public.prepaid_statement OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 26523)
-- Name: region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.region (
    region_id integer NOT NULL,
    region_name character varying(25) NOT NULL,
    postal_code character varying(10) NOT NULL
);


ALTER TABLE public.region OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 26522)
-- Name: region_region_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.region_region_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.region_region_id_seq OWNER TO postgres;

--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 215
-- Name: region_region_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.region_region_id_seq OWNED BY public.region.region_id;


--
-- TOC entry 241 (class 1259 OID 26729)
-- Name: residential_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.residential_connection (
    connection_id integer NOT NULL,
    property_type character varying(20),
    is_subsidized boolean DEFAULT false
);


ALTER TABLE public.residential_connection OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 26658)
-- Name: tariff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tariff (
    tariff_id integer NOT NULL,
    utility_id integer,
    tariff_name character varying(50) NOT NULL,
    consumer_category character varying(30) NOT NULL,
    billing_method character varying(30) NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    is_active boolean DEFAULT true
);


ALTER TABLE public.tariff OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 26670)
-- Name: tariff_slab; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tariff_slab (
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL,
    charge_type character varying(20),
    unit_from numeric(10,2) NOT NULL,
    unit_to numeric(10,2),
    rate_per_unit numeric(10,4) NOT NULL
);


ALTER TABLE public.tariff_slab OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 26657)
-- Name: tariff_tariff_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tariff_tariff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tariff_tariff_id_seq OWNER TO postgres;

--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 232
-- Name: tariff_tariff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tariff_tariff_id_seq OWNED BY public.tariff.tariff_id;


--
-- TOC entry 245 (class 1259 OID 26800)
-- Name: usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage (
    meter_id integer NOT NULL,
    usage_id bigint NOT NULL,
    tariff_id integer NOT NULL,
    slab_num integer NOT NULL,
    reading_id integer,
    time_from timestamp without time zone NOT NULL,
    time_to timestamp without time zone NOT NULL,
    unit_used numeric(10,2) NOT NULL,
    CONSTRAINT usage_check CHECK ((time_to > time_from)),
    CONSTRAINT usage_time_to_check CHECK ((time_to <= CURRENT_TIMESTAMP)),
    CONSTRAINT usage_unit_used_check CHECK ((unit_used >= (0)::numeric))
);


ALTER TABLE public.usage OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 26606)
-- Name: utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility (
    utility_id integer NOT NULL,
    utility_name character varying(50) NOT NULL,
    utility_type character varying(50) NOT NULL,
    billing_cycle character varying(20) NOT NULL,
    unit_of_measurement character varying(20) NOT NULL,
    status character varying(20)
);


ALTER TABLE public.utility OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 26707)
-- Name: utility_connection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_connection (
    connection_id integer NOT NULL,
    tariff_id integer NOT NULL,
    consumer_id integer NOT NULL,
    meter_id integer NOT NULL,
    payment_type character varying(20) NOT NULL,
    connection_type character varying(20) NOT NULL,
    connection_status character varying(20),
    connection_date date DEFAULT CURRENT_DATE,
    disconnection_date date,
    load_requirement numeric(8,2),
    connection_name character varying(30)
);


ALTER TABLE public.utility_connection OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 26706)
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utility_connection_connection_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utility_connection_connection_id_seq OWNER TO postgres;

--
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 239
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utility_connection_connection_id_seq OWNED BY public.utility_connection.connection_id;


--
-- TOC entry 231 (class 1259 OID 26642)
-- Name: utility_region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utility_region (
    utility_id integer NOT NULL,
    region_id integer NOT NULL
);


ALTER TABLE public.utility_region OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 26605)
-- Name: utility_utility_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.utility_utility_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.utility_utility_id_seq OWNER TO postgres;

--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 226
-- Name: utility_utility_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.utility_utility_id_seq OWNED BY public.utility.utility_id;


--
-- TOC entry 229 (class 1259 OID 26622)
-- Name: water_utility; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.water_utility (
    utility_id integer NOT NULL,
    pressure_level character varying(20),
    water_source character varying(20),
    quality_grade character varying(20)
);


ALTER TABLE public.water_utility OWNER TO postgres;

--
-- TOC entry 4912 (class 2604 OID 26559)
-- Name: account account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account ALTER COLUMN account_id SET DEFAULT nextval('public.account_account_id_seq'::regclass);


--
-- TOC entry 4910 (class 2604 OID 26533)
-- Name: address address_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address ALTER COLUMN address_id SET DEFAULT nextval('public.address_address_id_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 26903)
-- Name: balance_transaction transaction_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction ALTER COLUMN transaction_id SET DEFAULT nextval('public.balance_transaction_transaction_id_seq'::regclass);


--
-- TOC entry 4936 (class 2604 OID 26941)
-- Name: bank_name bank_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_name ALTER COLUMN bank_id SET DEFAULT nextval('public.bank_name_bank_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 26827)
-- Name: bill_document bill_document_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document ALTER COLUMN bill_document_id SET DEFAULT nextval('public.bill_document_bill_document_id_seq'::regclass);


--
-- TOC entry 4940 (class 2604 OID 27013)
-- Name: complaint complaint_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint ALTER COLUMN complaint_id SET DEFAULT nextval('public.complaint_complaint_id_seq'::regclass);


--
-- TOC entry 4942 (class 2604 OID 27093)
-- Name: connection_application application_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application ALTER COLUMN application_id SET DEFAULT nextval('public.connection_application_application_id_seq'::regclass);


--
-- TOC entry 4919 (class 2604 OID 26684)
-- Name: fixed_charge fixed_charge_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge ALTER COLUMN fixed_charge_id SET DEFAULT nextval('public.fixed_charge_fixed_charge_id_seq'::regclass);


--
-- TOC entry 4921 (class 2604 OID 26697)
-- Name: meter meter_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter ALTER COLUMN meter_id SET DEFAULT nextval('public.meter_meter_id_seq'::regclass);


--
-- TOC entry 4926 (class 2604 OID 26776)
-- Name: meter_reading reading_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading ALTER COLUMN reading_id SET DEFAULT nextval('public.meter_reading_reading_id_seq'::regclass);


--
-- TOC entry 4937 (class 2604 OID 26963)
-- Name: mobile_banking_provider provider_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking_provider ALTER COLUMN provider_id SET DEFAULT nextval('public.mobile_banking_provider_provider_id_seq'::regclass);


--
-- TOC entry 4938 (class 2604 OID 26995)
-- Name: payment payment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment ALTER COLUMN payment_id SET DEFAULT nextval('public.payment_payment_id_seq'::regclass);


--
-- TOC entry 4934 (class 2604 OID 26927)
-- Name: payment_method method_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method ALTER COLUMN method_id SET DEFAULT nextval('public.payment_method_method_id_seq'::regclass);


--
-- TOC entry 4911 (class 2604 OID 26545)
-- Name: person person_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person ALTER COLUMN person_id SET DEFAULT nextval('public.person_person_id_seq'::regclass);


--
-- TOC entry 4931 (class 2604 OID 26876)
-- Name: prepaid_account prepaid_account_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account ALTER COLUMN prepaid_account_id SET DEFAULT nextval('public.prepaid_account_prepaid_account_id_seq'::regclass);


--
-- TOC entry 4909 (class 2604 OID 26526)
-- Name: region region_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region ALTER COLUMN region_id SET DEFAULT nextval('public.region_region_id_seq'::regclass);


--
-- TOC entry 4917 (class 2604 OID 26661)
-- Name: tariff tariff_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff ALTER COLUMN tariff_id SET DEFAULT nextval('public.tariff_tariff_id_seq'::regclass);


--
-- TOC entry 4916 (class 2604 OID 26609)
-- Name: utility utility_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility ALTER COLUMN utility_id SET DEFAULT nextval('public.utility_utility_id_seq'::regclass);


--
-- TOC entry 4923 (class 2604 OID 26710)
-- Name: utility_connection connection_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection ALTER COLUMN connection_id SET DEFAULT nextval('public.utility_connection_connection_id_seq'::regclass);


--
-- TOC entry 5238 (class 0 OID 26556)
-- Dependencies: 222
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account (account_id, person_id, account_type, email, password_hashed, is_active, created_at) FROM stdin;
8	1	employee	john.doe@example.com	$2b$10$plmFVO2OPM.ggHvR8xqZs.iKW3/7cJgv/TXx9pVduDMnRvj6CSKye	t	2026-03-15 19:54:16.693215
7	1	consumer	john.doe@example.com	$2b$10$OpCao3mvea6c0rXUn0vaQeMcXRvUQJqxEohwXTyExkauv.VvUHm9G	t	2026-03-15 19:54:12.91012
9	2	consumer	adnath.val@gmail.com	$2b$10$f.v/F5JWqv55xuZ1m9UORulC8xa4Mfow22fR34EydwDcKMT99ub76	t	2026-03-15 20:16:16.384725
10	3	consumer	jdnath2001@gmail.com	$2b$10$qg0692LGGx0UA4MLiVSp0.uNybXdCFn.lXstmKUyzRm1zJJ58k1fW	t	2026-03-23 18:53:54.236151
11	1	field_worker	john.doe@example.com	$2b$10$GcKe93dp2qlxP9r4Qg4LbuVVLID9rMddymh0GaKbB.rRLjbyxwMem	t	2026-03-24 23:43:09.524399
\.


--
-- TOC entry 5234 (class 0 OID 26530)
-- Dependencies: 218
-- Data for Name: address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address (address_id, region_id, house_num, street_name, landmark) FROM stdin;
1	14	123	Main Street	\N
3	14	321	South Paikpara	
4	3	11B	street	
\.


--
-- TOC entry 5269 (class 0 OID 26900)
-- Dependencies: 253
-- Data for Name: balance_transaction; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.balance_transaction (transaction_id, meter_id, usage_id, bill_document_id, prepaid_account_id, transaction_amount, transaction_type, transaction_time, balance_after) FROM stdin;
1	\N	\N	1	2	100.00	CREDIT	2026-03-12 23:36:24.681064	100.00
2	1	120260301020000	\N	2	10.52	DEBIT	2026-03-12 23:36:24.681064	89.48
3	1	120260301040000	\N	2	15.78	DEBIT	2026-03-12 23:36:24.681064	73.70
4	1	120251001020000	\N	2	10.52	DEBIT	2026-03-12 23:36:24.681064	63.18
5	1	120251001040000	\N	2	15.78	DEBIT	2026-03-12 23:36:24.681064	47.40
6	1	120250601020000	\N	2	10.52	DEBIT	2026-03-12 23:36:24.681064	36.88
7	1	120250601040000	\N	2	15.78	DEBIT	2026-03-12 23:36:24.681064	21.10
8	\N	\N	6	2	475.00	CREDIT	2026-03-22 17:24:00.804706	496.10
9	\N	\N	7	2	10.00	CREDIT	2026-03-22 17:25:27.523311	506.10
10	\N	\N	11	2	1975.00	CREDIT	2026-03-22 17:32:19.54674	2481.10
\.


--
-- TOC entry 5274 (class 0 OID 26944)
-- Dependencies: 258
-- Data for Name: bank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank (method_id, bank_id, account_num) FROM stdin;
7	1	123456789876543
10	5	123456789
11	5	123456789
12	5	123456789
13	5	1234567890
21	2	21313123213
\.


--
-- TOC entry 5273 (class 0 OID 26938)
-- Dependencies: 257
-- Data for Name: bank_name; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_name (bank_id, bank_name) FROM stdin;
1	Brac Bank
2	City Bank
3	Dutch-Bangla Bank
4	Eastern Bank
5	IFIC Bank
6	Jamuna Bank
7	Mutual Trust Bank
8	National Bank
9	One Bank
10	Premier Bank
11	Pubali Bank
12	Sonali Bank
13	Standard Bank
14	Trust Bank
\.


--
-- TOC entry 5263 (class 0 OID 26824)
-- Dependencies: 247
-- Data for Name: bill_document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bill_document (bill_document_id, connection_id, bill_type, bill_generation_date, unit_consumed, energy_amount, total_amount, bill_status) FROM stdin;
1	1	PREPAID	2026-03-12	0.00	100.00	100.00	PAID
2	2	POSTPAID	2026-03-12	30.00	100.00	100.00	PAID
4	3	POSTPAID	2026-03-18	30.00	100.00	100.00	PAID
3	2	POSTPAID	2026-03-16	30.00	100.00	100.00	UNPAID
6	1	PREPAID	2026-03-22	0.00	475.00	500.00	PAID
7	1	PREPAID	2026-03-22	0.00	10.00	10.00	PAID
8	1	PREPAID	2026-03-22	0.00	2000.00	2000.00	CANCELLED
9	1	PREPAID	2026-03-22	0.00	1975.00	2000.00	CANCELLED
10	1	PREPAID	2026-03-22	0.00	1975.00	2000.00	CANCELLED
11	1	PREPAID	2026-03-22	0.00	1975.00	2000.00	PAID
12	1	PREPAID	2026-03-22	0.00	2000.00	2000.00	CANCELLED
13	1	PREPAID	2026-03-22	0.00	1500.00	1500.00	CANCELLED
14	1	PREPAID	2026-03-27	0.00	1000.00	1000.00	CANCELLED
\.


--
-- TOC entry 5264 (class 0 OID 26837)
-- Dependencies: 248
-- Data for Name: bill_postpaid; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bill_postpaid (bill_document_id, bill_period_start, bill_period_end, due_date, remarks) FROM stdin;
2	2026-01-01	2026-01-31	2026-07-15	\N
3	2026-01-01	2026-01-31	2026-07-15	\N
4	2026-01-01	2026-01-31	2026-07-15	\N
\.


--
-- TOC entry 5258 (class 0 OID 26740)
-- Dependencies: 242
-- Data for Name: commercial_connection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.commercial_connection (connection_id, business_name, operating_hours, tax_id) FROM stdin;
\.


--
-- TOC entry 5282 (class 0 OID 27010)
-- Dependencies: 266
-- Data for Name: complaint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.complaint (complaint_id, consumer_id, connection_id, assigned_by, assigned_to, complaint_date, description, status, assignment_date, resolution_date, remarks) FROM stdin;
1	1	1	\N	\N	2026-03-15 19:46:38.215414	test	Pending	\N	\N	\N
3	1	\N	\N	\N	2026-03-23 15:12:42.481026	CHANGE REQUEST — Address\nCurrent: 123, Main Street, Mirpur\nRequested: 321, Main Street\nReason: Wrong Address	Pending	\N	\N	\N
2	1	2	1	1	2026-03-23 15:06:36.290569	Meter Inactive	In Progress	2026-03-25	\N	\N
\.


--
-- TOC entry 5286 (class 0 OID 27090)
-- Dependencies: 270
-- Data for Name: connection_application; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.connection_application (application_id, consumer_id, reviewed_by, utility_id, region_id, application_date, status, requested_connection_type, address, review_date, approval_date, priority) FROM stdin;
2	1	\N	1	14	2026-03-23	Pending	Residential	123, Notun Bazaar	\N	\N	Urgent
3	1	\N	1	14	2026-03-23	Pending	Commercial	212, Tolarbag	\N	\N	Normal
1	1	1	2	14	2026-03-23	Approved	Residential	345, Shewrapara	2026-03-25	2026-03-25	High
\.


--
-- TOC entry 5239 (class 0 OID 26569)
-- Dependencies: 223
-- Data for Name: consumer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consumer (person_id, consumer_type, registration_date) FROM stdin;
1	Residential	2025-06-29
2	Residential	2026-03-15
3	Residential	2026-03-23
\.


--
-- TOC entry 5244 (class 0 OID 26612)
-- Dependencies: 228
-- Data for Name: electricity_utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.electricity_utility (utility_id, voltage_level, phase_type) FROM stdin;
1	220V	Single Phase
\.


--
-- TOC entry 5240 (class 0 OID 26580)
-- Dependencies: 224
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee (person_id, role, employee_num, hire_date, employment_status) FROM stdin;
1	admin	EMP001	2020-01-01	Active
\.


--
-- TOC entry 5241 (class 0 OID 26590)
-- Dependencies: 225
-- Data for Name: field_worker; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.field_worker (person_id, assigned_region_id, expertise, skillset) FROM stdin;
1	14	Meter Installation	Electrical, Plumbing
\.


--
-- TOC entry 5252 (class 0 OID 26681)
-- Dependencies: 236
-- Data for Name: fixed_charge; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixed_charge (fixed_charge_id, tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory) FROM stdin;
1011	101	Meter Rent	25.00	Monthly	t
1012	101	Demand Charge	42.00	Monthly	t
\.


--
-- TOC entry 5283 (class 0 OID 27056)
-- Dependencies: 267
-- Data for Name: fixed_charge_applied; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixed_charge_applied (fixed_charge_id, bill_document_id, amount, timeframe) FROM stdin;
1011	6	25.00	March    
1011	9	25.00	Feb 2026
1011	10	25.00	Feb 2026
1011	11	25.00	Feb 2026
\.


--
-- TOC entry 5284 (class 0 OID 27071)
-- Dependencies: 268
-- Data for Name: fixed_charge_owed; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fixed_charge_owed (fixed_charge_id, prepaid_account_id, amount, timeframe) FROM stdin;
\.


--
-- TOC entry 5246 (class 0 OID 26632)
-- Dependencies: 230
-- Data for Name: gas_utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.gas_utility (utility_id, gas_type, pressure_category) FROM stdin;
\.


--
-- TOC entry 5278 (class 0 OID 26981)
-- Dependencies: 262
-- Data for Name: google_pay; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.google_pay (method_id, email, phone_num) FROM stdin;
2	ananta.deb2005@gmail.com	\N
3	ananta.deb2005@gmail.com	\N
8	ananta.deb2005@gmail.com	\N
9	adnath.val@gmail.com	\N
14	ananta.deb2005@gmail.com	0
15	adnath.val@gmail.com	\N
28	ananta.deb2005@gmail.com	\N
29	jdnath2001@gmail.com	\N
\.


--
-- TOC entry 5254 (class 0 OID 26694)
-- Dependencies: 238
-- Data for Name: meter; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meter (meter_id, address_id, meter_type, is_active) FROM stdin;
2	1	Electricity	f
5	1	Water	f
1	1	Electricity	t
\.


--
-- TOC entry 5260 (class 0 OID 26773)
-- Dependencies: 244
-- Data for Name: meter_reading; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.meter_reading (reading_id, meter_id, tariff_id, slab_num, approved_by, field_worker_id, time_from, time_to, units_logged, reading_date) FROM stdin;
\.


--
-- TOC entry 5277 (class 0 OID 26966)
-- Dependencies: 261
-- Data for Name: mobile_banking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mobile_banking (method_id, provider_id, phone_num) FROM stdin;
1	1	01712345678
6	1	01234567890
24	2	011111111111
\.


--
-- TOC entry 5276 (class 0 OID 26960)
-- Dependencies: 260
-- Data for Name: mobile_banking_provider; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mobile_banking_provider (provider_id, provider_name) FROM stdin;
1	bKash
2	Nagad
3	Rocket
4	Upay
\.


--
-- TOC entry 5280 (class 0 OID 26992)
-- Dependencies: 264
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment (payment_id, bill_document_id, method_id, payment_amount, payment_date, status) FROM stdin;
1	1	1	100.00	2026-03-12 23:36:24.681064	\N
2	2	6	100.00	2026-03-15 23:30:28.231318	Completed
3	4	7	100.00	2026-03-19 14:51:46.096784	Completed
7	6	28	500.00	2026-03-22 17:24:00.804706	Completed
8	7	28	10.00	2026-03-22 17:25:27.523311	Completed
9	11	7	2000.00	2026-03-22 17:32:19.54674	Completed
\.


--
-- TOC entry 5271 (class 0 OID 26924)
-- Dependencies: 255
-- Data for Name: payment_method; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_method (method_id, consumer_id, method_name, is_default) FROM stdin;
1	\N	Mobile Banking	f
2	\N	google_pay	f
24	\N	mobile_banking	f
7	1	bank	f
13	1	bank	f
6	1	mobile_banking	f
28	1	google_pay	t
29	1	google_pay	f
3	\N	google_pay	t
9	\N	google_pay	f
8	\N	google_pay	f
12	\N	bank	f
11	\N	bank	f
10	\N	bank	f
15	\N	google_pay	f
14	\N	google_pay	f
21	\N	bank	t
\.


--
-- TOC entry 5236 (class 0 OID 26542)
-- Dependencies: 220
-- Data for Name: person; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.person (person_id, address_id, first_name, last_name, date_of_birth, gender, phone_number, national_id) FROM stdin;
1	1	John	Doe	1990-01-01	Male	01234567890	0123456789
2	3	Ananta	Debnath	2005-02-09	Male	01234567891	1234567890
3	4	JD	Nath	2026-03-04	Female	1	11
\.


--
-- TOC entry 5267 (class 0 OID 26873)
-- Dependencies: 251
-- Data for Name: prepaid_account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prepaid_account (prepaid_account_id, connection_id, balance) FROM stdin;
2	1	2481.10
\.


--
-- TOC entry 5265 (class 0 OID 26847)
-- Dependencies: 249
-- Data for Name: prepaid_statement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prepaid_statement (bill_document_id, prepaid_token) FROM stdin;
1	\N
6	\N
7	\N
8	\N
9	\N
10	\N
11	\N
12	\N
13	\N
14	\N
\.


--
-- TOC entry 5232 (class 0 OID 26523)
-- Dependencies: 216
-- Data for Name: region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.region (region_id, region_name, postal_code) FROM stdin;
1	Motijheel	1000
2	Dhaka Sadar	1100
3	Nilkhet	1205
4	Kochukhet	1206
5	Mohammadpur	1207
6	Kamrangirchar	1211
7	Tejgaon	1208
8	Dhanmondi	1209
9	Gulshan	1212
10	Banani	1213
11	Khilgaon	1214
12	Banani	1219
13	Tejgaon	1215
14	Mirpur	1216
15	Shantinagar	1217
16	Mohammadpur	1222
17	Motijheel	1223
18	Lalmati	1225
19	Khilkhet	1229
20	Uttara	1230
\.


--
-- TOC entry 5257 (class 0 OID 26729)
-- Dependencies: 241
-- Data for Name: residential_connection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.residential_connection (connection_id, property_type, is_subsidized) FROM stdin;
1	Apartment	f
2	Apartment	f
3	Apartment	f
\.


--
-- TOC entry 5249 (class 0 OID 26658)
-- Dependencies: 233
-- Data for Name: tariff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tariff (tariff_id, utility_id, tariff_name, consumer_category, billing_method, effective_from, effective_to, is_active) FROM stdin;
101	1	LT-A	Residential	Slab	2024-02-29	\N	t
201	2	W-1	Residential	Slab	2024-02-29	\N	t
\.


--
-- TOC entry 5250 (class 0 OID 26670)
-- Dependencies: 234
-- Data for Name: tariff_slab; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit) FROM stdin;
101	1	\N	0.00	75.00	5.2600
101	2	\N	76.00	200.00	7.2000
101	3	\N	201.00	300.00	7.5900
101	4	\N	301.00	400.00	8.0200
101	5	\N	401.00	600.00	12.6700
101	6	\N	601.00	\N	14.6100
201	1	\N	0.00	\N	15.0000
\.


--
-- TOC entry 5261 (class 0 OID 26800)
-- Dependencies: 245
-- Data for Name: usage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage (meter_id, usage_id, tariff_id, slab_num, reading_id, time_from, time_to, unit_used) FROM stdin;
1	120260301020000	101	1	\N	2026-03-01 01:00:00	2026-03-01 02:00:00	2.00
1	120260301040000	101	1	\N	2026-03-01 03:00:00	2026-03-01 04:00:00	3.00
1	120251001020000	101	1	\N	2025-10-01 01:00:00	2025-10-01 02:00:00	2.00
1	120251001040000	101	1	\N	2025-10-01 03:00:00	2025-10-01 04:00:00	3.00
1	120250601020000	101	1	\N	2025-06-01 01:00:00	2025-06-01 02:00:00	2.00
1	120250601040000	101	1	\N	2025-06-01 03:00:00	2025-06-01 04:00:00	3.00
\.


--
-- TOC entry 5243 (class 0 OID 26606)
-- Dependencies: 227
-- Data for Name: utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility (utility_id, utility_name, utility_type, billing_cycle, unit_of_measurement, status) FROM stdin;
1	Electricity_LV	Electricity	Monthly	kWh	Active
2	Water	Water	Monthly	m³	Active
\.


--
-- TOC entry 5256 (class 0 OID 26707)
-- Dependencies: 240
-- Data for Name: utility_connection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility_connection (connection_id, tariff_id, consumer_id, meter_id, payment_type, connection_type, connection_status, connection_date, disconnection_date, load_requirement, connection_name) FROM stdin;
2	101	1	2	POSTPAID	Residential	Active	2025-06-29	\N	\N	Workshop
3	201	1	5	POSTPAID	Residential	Active	2025-06-29	\N	\N	Home
1	101	1	1	PREPAID	Residential	Active	2025-06-29	\N	\N	Home
\.


--
-- TOC entry 5247 (class 0 OID 26642)
-- Dependencies: 231
-- Data for Name: utility_region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.utility_region (utility_id, region_id) FROM stdin;
1	14
2	14
\.


--
-- TOC entry 5245 (class 0 OID 26622)
-- Dependencies: 229
-- Data for Name: water_utility; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.water_utility (utility_id, pressure_level, water_source, quality_grade) FROM stdin;
2	High	Groundwater	Good
\.


--
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 221
-- Name: account_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_account_id_seq', 11, true);


--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 217
-- Name: address_address_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.address_address_id_seq', 4, true);


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 252
-- Name: balance_transaction_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.balance_transaction_transaction_id_seq', 10, true);


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 256
-- Name: bank_name_bank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_name_bank_id_seq', 14, true);


--
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 246
-- Name: bill_document_bill_document_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bill_document_bill_document_id_seq', 14, true);


--
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 265
-- Name: complaint_complaint_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.complaint_complaint_id_seq', 3, true);


--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 269
-- Name: connection_application_application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.connection_application_application_id_seq', 3, true);


--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 235
-- Name: fixed_charge_fixed_charge_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fixed_charge_fixed_charge_id_seq', 1, false);


--
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 237
-- Name: meter_meter_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meter_meter_id_seq', 5, true);


--
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 243
-- Name: meter_reading_reading_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.meter_reading_reading_id_seq', 1, false);


--
-- TOC entry 5321 (class 0 OID 0)
-- Dependencies: 259
-- Name: mobile_banking_provider_provider_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mobile_banking_provider_provider_id_seq', 4, true);


--
-- TOC entry 5322 (class 0 OID 0)
-- Dependencies: 254
-- Name: payment_method_method_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_method_method_id_seq', 29, true);


--
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 263
-- Name: payment_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_payment_id_seq', 9, true);


--
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 219
-- Name: person_person_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.person_person_id_seq', 3, true);


--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 250
-- Name: prepaid_account_prepaid_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.prepaid_account_prepaid_account_id_seq', 2, true);


--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 215
-- Name: region_region_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.region_region_id_seq', 20, true);


--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 232
-- Name: tariff_tariff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tariff_tariff_id_seq', 1, false);


--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 239
-- Name: utility_connection_connection_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utility_connection_connection_id_seq', 3, true);


--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 226
-- Name: utility_utility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utility_utility_id_seq', 2, true);


--
-- TOC entry 4959 (class 2606 OID 26563)
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (account_id);


--
-- TOC entry 4953 (class 2606 OID 26535)
-- Name: address address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_pkey PRIMARY KEY (address_id);


--
-- TOC entry 5003 (class 2606 OID 26907)
-- Name: balance_transaction balance_transaction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_pkey PRIMARY KEY (transaction_id);


--
-- TOC entry 5008 (class 2606 OID 26943)
-- Name: bank_name bank_name_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_name
    ADD CONSTRAINT bank_name_pkey PRIMARY KEY (bank_id);


--
-- TOC entry 5010 (class 2606 OID 26948)
-- Name: bank bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4995 (class 2606 OID 26831)
-- Name: bill_document bill_document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document
    ADD CONSTRAINT bill_document_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4997 (class 2606 OID 26841)
-- Name: bill_postpaid bill_postpaid_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_postpaid
    ADD CONSTRAINT bill_postpaid_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4989 (class 2606 OID 26744)
-- Name: commercial_connection commercial_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_connection
    ADD CONSTRAINT commercial_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 5020 (class 2606 OID 27018)
-- Name: complaint complaint_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_pkey PRIMARY KEY (complaint_id);


--
-- TOC entry 5026 (class 2606 OID 27100)
-- Name: connection_application connection_application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_pkey PRIMARY KEY (application_id);


--
-- TOC entry 4961 (class 2606 OID 26574)
-- Name: consumer consumer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer
    ADD CONSTRAINT consumer_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4969 (class 2606 OID 26616)
-- Name: electricity_utility electricity_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_utility
    ADD CONSTRAINT electricity_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4963 (class 2606 OID 26584)
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (person_id);


--
-- TOC entry 4965 (class 2606 OID 26594)
-- Name: field_worker field_worker_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_pkey PRIMARY KEY (person_id);


--
-- TOC entry 5022 (class 2606 OID 27060)
-- Name: fixed_charge_applied fixed_charge_applied_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_pkey PRIMARY KEY (fixed_charge_id, bill_document_id, timeframe);


--
-- TOC entry 5024 (class 2606 OID 27075)
-- Name: fixed_charge_owed fixed_charge_owed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_pkey PRIMARY KEY (fixed_charge_id, prepaid_account_id, timeframe);


--
-- TOC entry 4981 (class 2606 OID 26687)
-- Name: fixed_charge fixed_charge_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge
    ADD CONSTRAINT fixed_charge_pkey PRIMARY KEY (fixed_charge_id);


--
-- TOC entry 4973 (class 2606 OID 26636)
-- Name: gas_utility gas_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gas_utility
    ADD CONSTRAINT gas_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 5016 (class 2606 OID 26985)
-- Name: google_pay google_pay_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_pay
    ADD CONSTRAINT google_pay_pkey PRIMARY KEY (method_id);


--
-- TOC entry 4983 (class 2606 OID 26700)
-- Name: meter meter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter
    ADD CONSTRAINT meter_pkey PRIMARY KEY (meter_id);


--
-- TOC entry 4991 (class 2606 OID 26779)
-- Name: meter_reading meter_reading_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_pkey PRIMARY KEY (reading_id);


--
-- TOC entry 5014 (class 2606 OID 26970)
-- Name: mobile_banking mobile_banking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_pkey PRIMARY KEY (method_id);


--
-- TOC entry 5012 (class 2606 OID 26965)
-- Name: mobile_banking_provider mobile_banking_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking_provider
    ADD CONSTRAINT mobile_banking_provider_pkey PRIMARY KEY (provider_id);


--
-- TOC entry 5006 (class 2606 OID 26930)
-- Name: payment_method payment_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method
    ADD CONSTRAINT payment_method_pkey PRIMARY KEY (method_id);


--
-- TOC entry 5018 (class 2606 OID 26998)
-- Name: payment payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 4955 (class 2606 OID 26549)
-- Name: person person_national_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_national_id_key UNIQUE (national_id);


--
-- TOC entry 4957 (class 2606 OID 26547)
-- Name: person person_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_pkey PRIMARY KEY (person_id);


--
-- TOC entry 5001 (class 2606 OID 26878)
-- Name: prepaid_account prepaid_account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account
    ADD CONSTRAINT prepaid_account_pkey PRIMARY KEY (prepaid_account_id);


--
-- TOC entry 4999 (class 2606 OID 26851)
-- Name: prepaid_statement prepaid_statement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_statement
    ADD CONSTRAINT prepaid_statement_pkey PRIMARY KEY (bill_document_id);


--
-- TOC entry 4951 (class 2606 OID 26528)
-- Name: region region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.region
    ADD CONSTRAINT region_pkey PRIMARY KEY (region_id);


--
-- TOC entry 4987 (class 2606 OID 26734)
-- Name: residential_connection residential_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.residential_connection
    ADD CONSTRAINT residential_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4977 (class 2606 OID 26664)
-- Name: tariff tariff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff
    ADD CONSTRAINT tariff_pkey PRIMARY KEY (tariff_id);


--
-- TOC entry 4979 (class 2606 OID 26674)
-- Name: tariff_slab tariff_slab_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff_slab
    ADD CONSTRAINT tariff_slab_pkey PRIMARY KEY (tariff_id, slab_num);


--
-- TOC entry 4993 (class 2606 OID 26807)
-- Name: usage usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_pkey PRIMARY KEY (meter_id, usage_id);


--
-- TOC entry 4985 (class 2606 OID 26713)
-- Name: utility_connection utility_connection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_pkey PRIMARY KEY (connection_id);


--
-- TOC entry 4967 (class 2606 OID 26611)
-- Name: utility utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility
    ADD CONSTRAINT utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 4975 (class 2606 OID 26646)
-- Name: utility_region utility_region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_pkey PRIMARY KEY (utility_id, region_id);


--
-- TOC entry 4971 (class 2606 OID 26626)
-- Name: water_utility water_utility_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_utility
    ADD CONSTRAINT water_utility_pkey PRIMARY KEY (utility_id);


--
-- TOC entry 5004 (class 1259 OID 26936)
-- Name: one_default_payment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX one_default_payment_method ON public.payment_method USING btree (consumer_id) WHERE (is_default = true);


--
-- TOC entry 5082 (class 2620 OID 27043)
-- Name: utility_connection create_prepaid_account_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER create_prepaid_account_after_insert_trg AFTER INSERT ON public.utility_connection FOR EACH ROW EXECUTE FUNCTION public.create_prepaid_account_after_insert();


--
-- TOC entry 5086 (class 2620 OID 27051)
-- Name: payment payment_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER payment_after_insert_trg AFTER INSERT ON public.payment FOR EACH ROW EXECUTE FUNCTION public.payment_after_insert();


--
-- TOC entry 5087 (class 2620 OID 27088)
-- Name: fixed_charge_owed remove_fully_paid_fixed_charge_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER remove_fully_paid_fixed_charge_trg AFTER UPDATE OF amount ON public.fixed_charge_owed FOR EACH ROW WHEN ((new.amount <= (0)::numeric)) EXECUTE FUNCTION public.remove_fully_paid_fixed_charge();


--
-- TOC entry 5085 (class 2620 OID 27045)
-- Name: balance_transaction update_balance_for_transaction_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_balance_for_transaction_trg BEFORE INSERT ON public.balance_transaction FOR EACH ROW EXECUTE FUNCTION public.update_balance_for_transaction();


--
-- TOC entry 5083 (class 2620 OID 27049)
-- Name: usage usage_after_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usage_after_insert_trg AFTER INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.usage_after_insert();


--
-- TOC entry 5084 (class 2620 OID 27047)
-- Name: usage usage_before_insert_trg; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER usage_before_insert_trg BEFORE INSERT ON public.usage FOR EACH ROW EXECUTE FUNCTION public.usage_before_insert();


--
-- TOC entry 5029 (class 2606 OID 26564)
-- Name: account account_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5027 (class 2606 OID 26536)
-- Name: address address_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address
    ADD CONSTRAINT address_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5059 (class 2606 OID 26908)
-- Name: balance_transaction balance_transaction_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5060 (class 2606 OID 26918)
-- Name: balance_transaction balance_transaction_meter_id_usage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_meter_id_usage_id_fkey FOREIGN KEY (meter_id, usage_id) REFERENCES public.usage(meter_id, usage_id);


--
-- TOC entry 5061 (class 2606 OID 26913)
-- Name: balance_transaction balance_transaction_prepaid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balance_transaction
    ADD CONSTRAINT balance_transaction_prepaid_account_id_fkey FOREIGN KEY (prepaid_account_id) REFERENCES public.prepaid_account(prepaid_account_id);


--
-- TOC entry 5063 (class 2606 OID 26954)
-- Name: bank bank_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_bank_id_fkey FOREIGN KEY (bank_id) REFERENCES public.bank_name(bank_id);


--
-- TOC entry 5064 (class 2606 OID 26949)
-- Name: bank bank_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank
    ADD CONSTRAINT bank_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5055 (class 2606 OID 26832)
-- Name: bill_document bill_document_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_document
    ADD CONSTRAINT bill_document_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5056 (class 2606 OID 26842)
-- Name: bill_postpaid bill_postpaid_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_postpaid
    ADD CONSTRAINT bill_postpaid_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5047 (class 2606 OID 26745)
-- Name: commercial_connection commercial_connection_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.commercial_connection
    ADD CONSTRAINT commercial_connection_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5070 (class 2606 OID 27029)
-- Name: complaint complaint_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5071 (class 2606 OID 27034)
-- Name: complaint complaint_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.field_worker(person_id);


--
-- TOC entry 5072 (class 2606 OID 27024)
-- Name: complaint complaint_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5073 (class 2606 OID 27019)
-- Name: complaint complaint_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint
    ADD CONSTRAINT complaint_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5078 (class 2606 OID 27101)
-- Name: connection_application connection_application_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5079 (class 2606 OID 27116)
-- Name: connection_application connection_application_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5080 (class 2606 OID 27106)
-- Name: connection_application connection_application_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5081 (class 2606 OID 27111)
-- Name: connection_application connection_application_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connection_application
    ADD CONSTRAINT connection_application_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5030 (class 2606 OID 26575)
-- Name: consumer consumer_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer
    ADD CONSTRAINT consumer_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5034 (class 2606 OID 26617)
-- Name: electricity_utility electricity_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.electricity_utility
    ADD CONSTRAINT electricity_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5031 (class 2606 OID 26585)
-- Name: employee employee_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5032 (class 2606 OID 26600)
-- Name: field_worker field_worker_assigned_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_assigned_region_id_fkey FOREIGN KEY (assigned_region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5033 (class 2606 OID 26595)
-- Name: field_worker field_worker_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.field_worker
    ADD CONSTRAINT field_worker_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id);


--
-- TOC entry 5074 (class 2606 OID 27066)
-- Name: fixed_charge_applied fixed_charge_applied_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5075 (class 2606 OID 27061)
-- Name: fixed_charge_applied fixed_charge_applied_fixed_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_applied
    ADD CONSTRAINT fixed_charge_applied_fixed_charge_id_fkey FOREIGN KEY (fixed_charge_id) REFERENCES public.fixed_charge(fixed_charge_id);


--
-- TOC entry 5076 (class 2606 OID 27076)
-- Name: fixed_charge_owed fixed_charge_owed_fixed_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_fixed_charge_id_fkey FOREIGN KEY (fixed_charge_id) REFERENCES public.fixed_charge(fixed_charge_id);


--
-- TOC entry 5077 (class 2606 OID 27081)
-- Name: fixed_charge_owed fixed_charge_owed_prepaid_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge_owed
    ADD CONSTRAINT fixed_charge_owed_prepaid_account_id_fkey FOREIGN KEY (prepaid_account_id) REFERENCES public.prepaid_account(prepaid_account_id);


--
-- TOC entry 5041 (class 2606 OID 26688)
-- Name: fixed_charge fixed_charge_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fixed_charge
    ADD CONSTRAINT fixed_charge_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5036 (class 2606 OID 26637)
-- Name: gas_utility gas_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gas_utility
    ADD CONSTRAINT gas_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5067 (class 2606 OID 26986)
-- Name: google_pay google_pay_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.google_pay
    ADD CONSTRAINT google_pay_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5042 (class 2606 OID 26701)
-- Name: meter meter_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter
    ADD CONSTRAINT meter_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 5048 (class 2606 OID 26785)
-- Name: meter_reading meter_reading_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.employee(person_id);


--
-- TOC entry 5049 (class 2606 OID 26790)
-- Name: meter_reading meter_reading_field_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_field_worker_id_fkey FOREIGN KEY (field_worker_id) REFERENCES public.field_worker(person_id);


--
-- TOC entry 5050 (class 2606 OID 26780)
-- Name: meter_reading meter_reading_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5051 (class 2606 OID 26795)
-- Name: meter_reading meter_reading_tariff_id_slab_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meter_reading
    ADD CONSTRAINT meter_reading_tariff_id_slab_num_fkey FOREIGN KEY (tariff_id, slab_num) REFERENCES public.tariff_slab(tariff_id, slab_num);


--
-- TOC entry 5065 (class 2606 OID 26971)
-- Name: mobile_banking mobile_banking_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5066 (class 2606 OID 26976)
-- Name: mobile_banking mobile_banking_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mobile_banking
    ADD CONSTRAINT mobile_banking_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.mobile_banking_provider(provider_id);


--
-- TOC entry 5068 (class 2606 OID 26999)
-- Name: payment payment_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5062 (class 2606 OID 26931)
-- Name: payment_method payment_method_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_method
    ADD CONSTRAINT payment_method_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5069 (class 2606 OID 27004)
-- Name: payment payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment
    ADD CONSTRAINT payment_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.payment_method(method_id);


--
-- TOC entry 5028 (class 2606 OID 26550)
-- Name: person person_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.person
    ADD CONSTRAINT person_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address(address_id);


--
-- TOC entry 5058 (class 2606 OID 26879)
-- Name: prepaid_account prepaid_account_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_account
    ADD CONSTRAINT prepaid_account_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5057 (class 2606 OID 26852)
-- Name: prepaid_statement prepaid_statement_bill_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prepaid_statement
    ADD CONSTRAINT prepaid_statement_bill_document_id_fkey FOREIGN KEY (bill_document_id) REFERENCES public.bill_document(bill_document_id);


--
-- TOC entry 5046 (class 2606 OID 26735)
-- Name: residential_connection residential_connection_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.residential_connection
    ADD CONSTRAINT residential_connection_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.utility_connection(connection_id);


--
-- TOC entry 5040 (class 2606 OID 26675)
-- Name: tariff_slab tariff_slab_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff_slab
    ADD CONSTRAINT tariff_slab_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5039 (class 2606 OID 26665)
-- Name: tariff tariff_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tariff
    ADD CONSTRAINT tariff_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5052 (class 2606 OID 26808)
-- Name: usage usage_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5053 (class 2606 OID 26813)
-- Name: usage usage_reading_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_reading_id_fkey FOREIGN KEY (reading_id) REFERENCES public.meter_reading(reading_id);


--
-- TOC entry 5054 (class 2606 OID 26818)
-- Name: usage usage_tariff_id_slab_num_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage
    ADD CONSTRAINT usage_tariff_id_slab_num_fkey FOREIGN KEY (tariff_id, slab_num) REFERENCES public.tariff_slab(tariff_id, slab_num);


--
-- TOC entry 5043 (class 2606 OID 26719)
-- Name: utility_connection utility_connection_consumer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_consumer_id_fkey FOREIGN KEY (consumer_id) REFERENCES public.consumer(person_id);


--
-- TOC entry 5044 (class 2606 OID 26724)
-- Name: utility_connection utility_connection_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meter(meter_id);


--
-- TOC entry 5045 (class 2606 OID 26714)
-- Name: utility_connection utility_connection_tariff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_connection
    ADD CONSTRAINT utility_connection_tariff_id_fkey FOREIGN KEY (tariff_id) REFERENCES public.tariff(tariff_id);


--
-- TOC entry 5037 (class 2606 OID 26652)
-- Name: utility_region utility_region_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.region(region_id);


--
-- TOC entry 5038 (class 2606 OID 26647)
-- Name: utility_region utility_region_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utility_region
    ADD CONSTRAINT utility_region_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


--
-- TOC entry 5035 (class 2606 OID 26627)
-- Name: water_utility water_utility_utility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.water_utility
    ADD CONSTRAINT water_utility_utility_id_fkey FOREIGN KEY (utility_id) REFERENCES public.utility(utility_id);


-- Completed on 2026-03-27 21:27:31

--
-- PostgreSQL database dump complete
--

\unrestrict UbRrngN5xK704iQxPLiVdKFkfgc9iawGHbl4FPKCBg74YZ79X7so12i88ewxQcV

