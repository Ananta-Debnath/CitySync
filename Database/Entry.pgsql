DO $$
DECLARE
    v_address_id integer;
    v_person_id integer;
    v_meter_id integer;
    v_connection_id integer;
    v_bill_document_id integer;
    v_method_id integer;
BEGIN
    INSERT INTO address (region_id, house_num, street_name)
    VALUES (14, 123, 'Main Street')
    RETURNING address_id INTO v_address_id;

    INSERT INTO person (first_name, last_name, date_of_birth, gender, phone_number, national_id, address_id)
    VALUES ('John', 'Doe', '1990-01-01', 'Male', '01234567890', '0123456789', v_address_id)
    RETURNING person_id INTO v_person_id;

    -- pass -> 12345678
    INSERT INTO account (person_id, account_type, email, password_hashed)
    VALUES (v_person_id, 'consumer', 'john.doe@example.com', '$2b$10$C5K4waSBYDVRRfrpq35w1umgcdWjbK2Hg2KwoycnA0cOQKPnGZ0uC');

    INSERT INTO consumer (person_id, consumer_type, registration_date)
    VALUES (v_person_id, 'Residential', '2025-06-29');

    -- pass -> employee
    INSERT INTO account (person_id, account_type, email, password_hashed)
    VALUES (v_person_id, 'employee', 'john.doe@example.com', '$2b$10$plmFVO2OPM.ggHvR8xqZs.iKW3/7cJgv/TXx9pVduDMnRvj6CSKye');

    INSERT INTO employee (person_id, role, employee_num, hire_date, employment_status)
    VALUES (v_person_id, 'admin', 'EMP001', '2020-01-01', 'Active');

    INSERT INTO meter (address_id, meter_type)
    VALUES (v_address_id, 'Electricity')
    RETURNING meter_id INTO v_meter_id;

    INSERT INTO utility_connection (consumer_id, meter_id, tariff_id, payment_type, connection_type, connection_date, connection_status)
    VALUES (v_person_id, v_meter_id, 101, 'PREPAID', 'Residential', '2025-06-29', 'Active')
    RETURNING connection_id INTO v_connection_id;

    INSERT INTO residential_connection (connection_id, property_type, is_subsidized)
    VALUES (v_connection_id, 'Apartment', false);

    INSERT INTO bill_document (connection_id, bill_type, unit_consumed, energy_amount, total_amount, bill_status)
    VALUES (v_connection_id, 'PREPAID', 0, 100.00, 100.00, 'CANCELLED')
    RETURNING bill_document_id INTO v_bill_document_id;

    INSERT INTO prepaid_statement (bill_document_id)
    VALUES (v_bill_document_id);

    SELECT add_payment_method('mobile_banking', NULL, NULL, NULL, 'bKash', '01234567890', NULL, FALSE) INTO v_method_id;

    INSERT INTO payment (bill_document_id, method_id, payment_amount)
    VALUES (v_bill_document_id, v_method_id, 100.00);

    -- Two usage records at the start of the current month (first day)
    INSERT INTO usage (meter_id, tariff_id, slab_num, unit_used, time_from, time_to)
    VALUES (v_meter_id, 101, 1, 1, date_trunc('month', now()) + interval '1 hour', date_trunc('month', now()) + interval '2 hours');

    INSERT INTO usage (meter_id, tariff_id, slab_num, unit_used, time_from, time_to)
    VALUES (v_meter_id, 101, 1, 2, date_trunc('month', now()) + interval '3 hours', date_trunc('month', now()) + interval '4 hours');

    -- Two usage records for the previous month (first day)
    INSERT INTO usage (meter_id, tariff_id, slab_num, unit_used, time_from, time_to)
    VALUES (v_meter_id, 101, 1, 3, date_trunc('month', now()) - interval '5 month' + interval '1 hour', date_trunc('month', now()) - interval '5 month' + interval '2 hours');

    INSERT INTO usage (meter_id, tariff_id, slab_num, unit_used, time_from, time_to)
    VALUES (v_meter_id, 101, 1, 3, date_trunc('month', now()) - interval '5 month' + interval '3 hours', date_trunc('month', now()) - interval '5 month' + interval '4 hours');

    INSERT INTO usage (meter_id, tariff_id, slab_num, unit_used, time_from, time_to)
    VALUES (v_meter_id, 101, 1, 2, date_trunc('month', now()) - interval '9 month' + interval '1 hour', date_trunc('month', now()) - interval '9 month' + interval '2 hours');

    INSERT INTO usage (meter_id, tariff_id, slab_num, unit_used, time_from, time_to)
    VALUES (v_meter_id, 101, 1, 2, date_trunc('month', now()) - interval '9 month' + interval '3 hours', date_trunc('month', now()) - interval '9 month' + interval '4 hours');

    INSERT INTO meter (address_id, meter_type)
    VALUES (v_address_id, 'Electricity')
    RETURNING meter_id INTO v_meter_id;

    INSERT INTO utility_connection (consumer_id, meter_id, tariff_id, payment_type, connection_type, connection_date, connection_status)
    VALUES (v_person_id, v_meter_id, 101, 'POSTPAID', 'Residential', '2025-06-29', 'Active')
    RETURNING connection_id INTO v_connection_id;

    INSERT INTO residential_connection (connection_id, property_type, is_subsidized)
    VALUES (v_connection_id, 'Apartment', false);

    INSERT INTO bill_document (connection_id, bill_type, unit_consumed, energy_amount, total_amount)
    VALUES (v_connection_id, 'POSTPAID', 30, 100.00, 100.00)
    RETURNING bill_document_id INTO v_bill_document_id;

    INSERT INTO bill_postpaid (bill_document_id, bill_period_start, bill_period_end, due_date)
    VALUES (v_bill_document_id, '2026-01-01', '2026-01-31', '2026-07-15');

END
$$;