SELECT * FROM ACCOUNT;
SELECT * FROM ADDRESS;
SELECT * FROM BALANCE_TRANSACTION;
SELECT * FROM BANK;
SELECT * FROM BANK_NAME;
SELECT * FROM BILL_DOCUMENT;
SELECT * FROM BILL_ERROR_LOG;
SELECT * FROM BILL_POSTPAID;
SELECT * FROM COMMERCIAL_CONNECTION;
SELECT * FROM COMPLAINT;
SELECT * FROM CONNECTION_APPLICATION;
SELECT * FROM CONSUMER;
SELECT * FROM ELECTRICITY_UTILITY;
SELECT * FROM EMPLOYEE;
SELECT * FROM FIELD_WORKER;
SELECT * FROM FIXED_CHARGE;
SELECT * FROM FIXED_CHARGE_APPLIED;
SELECT * FROM FIXED_CHARGE_OWED;
SELECT * FROM GAS_UTILITY;
SELECT * FROM METER;
SELECT * FROM METER_READING;
SELECT * FROM MOBILE_BANKING;
SELECT * FROM MOBILE_BANKING_PROVIDER;
SELECT * FROM PAYMENT;
SELECT * FROM PAYMENT_METHOD;
SELECT * FROM GOOGLE_PAY;
SELECT * FROM PERSON;
SELECT * FROM PREPAID_ACCOUNT;
SELECT * FROM PREPAID_STATEMENT;
SELECT * FROM REGION;
SELECT * FROM RESIDENTIAL_CONNECTION;
SELECT * FROM TARIFF;
SELECT * FROM TARIFF_SLAB;
SELECT * FROM USAGE;
SELECT * FROM UTILITY;
SELECT * FROM UTILITY_CONNECTION;
SELECT * FROM UTILITY_REGION;
SELECT * FROM WATER_UTILITY;


SELECT calculate_energy_amount(1, '2025-06-01', '2025-06-30');


SELECT * FROM USAGE;
SELECT * FROM BALANCE_TRANSACTION;
SELECT * FROM PREPAID_ACCOUNT;

SELECT * FROM PREPAID_ACCOUNT;
SELECT * FROM BILL_DOCUMENT;
SELECT * FROM BALANCE_TRANSACTION;
SELECT * FROM PAYMENT;



SELECT setval(
  pg_get_serial_sequence('utility_connection','connection_id'),
  (SELECT COALESCE(MAX(connection_id), 0) FROM utility_connection)
);


-- ALTER TABLE usage
-- ADD COLUMN unit_of_measurement VARCHAR(20);

-- UPDATE usage
-- SET unit_of_measurement = 'kWh';

DELETE FROM payment
WHERE bill_document_id = 3;
UPDATE bill_document
SET bill_status = 'UNPAID'
WHERE bill_document_id = 3;



SELECT
  -- us.meter_id,
  -- us.usage_id,
  date_trunc('month', us.time_to) AS date,
  SUM(us.unit_used) AS units_logged,
  -- us.time_from,
  -- us.time_to,
  -- us.tariff_id,
  -- us.slab_num,
  -- get_rate(us.tariff_id, us.slab_num) AS rate,
  SUM(ROUND(us.unit_used * get_rate(us.tariff_id, us.slab_num))) AS cost,
  uc.connection_name,
  -- LOWER(u.utility_name)               AS utility_tag,
  u.unit_of_measurement
FROM usage us
JOIN utility_connection uc ON us.meter_id  = uc.meter_id
JOIN tariff  t             ON us.tariff_id = t.tariff_id
JOIN utility u             ON t.utility_id = u.utility_id
-- WHERE uc.consumer_id = $1
WHERE uc.consumer_id = 1
GROUP BY date, us.tariff_id, uc.connection_name, u.unit_of_measurement
ORDER BY date DESC
LIMIT 60;



SELECT
  date_trunc('month', us.time_to) AS date,
  SUM(us.unit_used) AS units_logged,
  SUM(ROUND(us.unit_used * get_rate(us.tariff_id, us.slab_num))) AS cost,
  u.unit_of_measurement
FROM usage us
JOIN utility_connection uc ON us.meter_id  = uc.meter_id
JOIN tariff  t             ON us.tariff_id = t.tariff_id
JOIN utility u             ON t.utility_id = u.utility_id
-- WHERE uc.consumer_id = $1 AND uc.connection_id = $2
WHERE uc.consumer_id = 1 AND uc.connection_id = 1
GROUP BY date, us.tariff_id, u.unit_of_measurement
ORDER BY date DESC
LIMIT 60;


-- Last 12 months usage per month (includes months with zero usage)
-- Replace $1 (consumer_id) and $2 (connection_id) with parameters or hardcode values for testing
WITH months AS (
  SELECT generate_series(
    date_trunc('month', CURRENT_DATE) - INTERVAL '23 months',
    date_trunc('month', CURRENT_DATE),
    INTERVAL '1 month'
  ) AS month_start
),
usage_filtered AS (
  SELECT us.*
  FROM usage us
  JOIN utility_connection uc ON us.meter_id = uc.meter_id
  -- WHERE uc.consumer_id = $1 AND uc.connection_id = $2
  WHERE uc.consumer_id = 1 AND uc.connection_id = 1
)
SELECT
  to_char(m.month_start, 'YYYY-MM') AS month,
  to_char(m.month_start, 'FMMonth YYYY') AS month_name,
  COALESCE(SUM(us.unit_used), 0) AS units_logged,
  COALESCE(SUM(ROUND(us.unit_used * get_rate(us.tariff_id, us.slab_num))), 0) AS cost,
  MAX(u.unit_of_measurement) AS unit_of_measurement
FROM months m
LEFT JOIN usage_filtered us
  ON date_trunc('month', us.time_to) = m.month_start
LEFT JOIN tariff t ON us.tariff_id = t.tariff_id
LEFT JOIN utility u ON t.utility_id = u.utility_id
GROUP BY m.month_start
ORDER BY m.month_start DESC;




SELECT c.complaint_id,
             COALESCE(r.region_id, pr.region_id) AS region_id,
             COALESCE(r.region_name, pr.region_name) AS region_name
      FROM complaint c
      LEFT JOIN utility_connection uc ON c.connection_id = uc.connection_id
      LEFT JOIN meter m ON uc.meter_id = m.meter_id
      LEFT JOIN address a ON m.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      -- fallback: consumer -> person -> address -> region
      LEFT JOIN person p ON c.consumer_id = p.person_id
      LEFT JOIN address pa ON p.address_id = pa.address_id
      LEFT JOIN region pr ON pa.region_id = pr.region_id
      WHERE c.complaint_id = 3



SELECT pa.prepaid_account_id, fc.fixed_charge_id, fc.charge_amount, to_char(CURRENT_DATE, 'YYYY-MM')
      FROM prepaid_account pa
      JOIN utility_connection uc ON pa.connection_id = uc.connection_id
      JOIN tariff t ON uc.tariff_id = t.tariff_id
      JOIN fixed_charge fc ON t.tariff_id = fc.tariff_id
      WHERE fc.is_mandatory AND fc.charge_frequency ILIKE 'MONTHLY';


INSERT INTO usage (meter_id, time_from, time_to, unit_used, tariff_id, slab_num)
VALUES (2, '2026-03-01 00:00:00', '2026-03-1 23:59:59', 350, 101, 1);

CALL create_postpaid_bill_for_connection(3, '2026-03-01', '2026-03-31', 15);
CALL create_monthly_postpaid_bills();

SELECT * FROM BILL_DOCUMENT bd
JOIN BILL_POSTPAID bp ON bd.bill_document_id = bp.bill_document_id;


DELETE FROM fixed_charge_applied
WHERE bill_document_id = 27;
DELETE FROM bill_postpaid
WHERE bill_document_id = 27;
DELETE FROM bill_document
WHERE bill_document_id = 27;

DELETE FROM fixed_charge_owed
WHERE prepaid_account_id = 2;


SELECT (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE AS previous_month_start,
       ((date_trunc('month', CURRENT_DATE) - INTERVAL '1 month') + INTERVAL '1 month')::DATE AS end_;
