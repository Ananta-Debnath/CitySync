SELECT * FROM ACCOUNT;
SELECT * FROM ADDRESS;
SELECT * FROM BALANCE_TRANSACTION;
SELECT * FROM BANK;
SELECT * FROM BANK_NAME;
SELECT * FROM BILL_DOCUMENT;
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




SELECT
        p.person_id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.national_id,
        p.date_of_birth,
        p.gender,
        a.email,
        a.account_type   AS role,
        a.created_at,
        a.avatar_url,
        c.consumer_type,
        c.registration_date,
        addr.house_num,
        addr.street_name,
        addr.landmark,
        r.region_name,
        r.postal_code,
        -- Stats
        (SELECT COUNT(*) FROM utility_connection uc WHERE uc.consumer_id = p.person_id)               AS total_connections,
        (SELECT COUNT(*) FROM utility_connection uc
          JOIN bill_document bd ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id = p.person_id AND bd.bill_status NOT ILIKE 'CANCELLED')                                                          AS total_bills,
        (SELECT COALESCE(SUM(bd.total_amount),0) FROM utility_connection uc
          JOIN bill_document bd ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id = p.person_id AND bd.bill_status = 'PAID')                              AS total_paid,
        (SELECT COALESCE(SUM(bd.total_amount),0) FROM utility_connection uc
          JOIN bill_document bd ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id = p.person_id AND bd.bill_status ILIKE 'UNPAID')                        AS total_outstanding,
        (SELECT COUNT(*) FROM complaint WHERE consumer_id = p.person_id)                               AS total_complaints,
        (SELECT COUNT(*) FROM connection_application WHERE consumer_id = p.person_id)                  AS total_applications
      FROM person p
      JOIN account  a    ON a.person_id    = p.person_id
      JOIN consumer c    ON c.person_id    = p.person_id
      JOIN address  addr ON p.address_id   = addr.address_id
      JOIN region   r    ON addr.region_id = r.region_id
      WHERE p.person_id = 1 AND a.account_type ILIKE 'CONSUMER';