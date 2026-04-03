const pool = require("../db");


const getConnections = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        uc.connection_id,
        uc.connection_name,
        uc.connection_status,
        uc.connection_date,
        uc.payment_type,
        uc.connection_type,
        u.utility_name,
        LOWER(u.utility_type) AS utility_tag,
        u.unit_of_measurement,
        a.house_num,
        a.street_name,
        r.region_name,
        COALESCE((
          SELECT SUM(us.unit_used)
          FROM usage us
          WHERE us.meter_id = uc.meter_id
            AND us.time_to >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS units_used -- usage for current month
      FROM utility_connection uc
      JOIN tariff  t  ON uc.tariff_id  = t.tariff_id
      JOIN utility u  ON t.utility_id  = u.utility_id
      JOIN meter   m  ON uc.meter_id   = m.meter_id
      JOIN address a  ON m.address_id  = a.address_id
      JOIN region  r  ON a.region_id   = r.region_id
      WHERE uc.consumer_id = $1
      ORDER BY uc.connection_date DESC, uc.connection_id ASC
    `, [req.user.person_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
}

const getConnectionDetails = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        uc.connection_id,
        uc.connection_name,
        uc.connection_status,
        uc.connection_date,
        uc.payment_type,
        uc.connection_type,
        m.meter_id,
        m.meter_type,
        m.is_active AS meter_active,
        u.utility_type,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_type)   AS utility_tag,
        t.tariff_name,
        t.billing_method,
        a.house_num,
        a.street_name,
        r.region_name,
        COALESCE((
          SELECT SUM(us.unit_used)
          FROM usage us
          WHERE us.meter_id = uc.meter_id
            AND us.time_to >= DATE_TRUNC('month', CURRENT_DATE)
        ), 0) AS units_used, -- usage for current month
        eu.voltage_level        AS electricity_voltage_level,
        eu.phase_type           AS electricity_phase_type,
        wu.pressure_level       AS water_pressure_level,
        wu.water_source         AS water_source,
        wu.quality_grade        AS water_quality_grade,
        gu.gas_type             AS gas_type,
        gu.pressure_category    AS gas_pressure_category,
        pa.prepaid_account_id   AS prepaid_account_id,
        pa.balance             AS prepaid_balance
      FROM utility_connection uc
      JOIN tariff  t  ON uc.tariff_id  = t.tariff_id
      JOIN utility u  ON t.utility_id  = u.utility_id
      LEFT JOIN electricity_utility eu ON u.utility_id = eu.utility_id
      LEFT JOIN water_utility       wu ON u.utility_id = wu.utility_id
      LEFT JOIN gas_utility         gu ON u.utility_id = gu.utility_id
      LEFT JOIN prepaid_account    pa ON uc.connection_id = pa.connection_id
      JOIN meter   m  ON uc.meter_id   = m.meter_id
      JOIN address a  ON m.address_id  = a.address_id
      JOIN region  r  ON a.region_id   = r.region_id
      WHERE uc.consumer_id = $1 AND uc.connection_id = $2
    `, [req.user.person_id, req.params.id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Connection not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch connection details' });
  }
}


// Normalize DB bill_status (UNPAID/PAID) → frontend values (Pending/Paid/Overdue)
// Overdue is determined by due_date, not stored in DB
const statusSQL = `
  CASE
    WHEN bd.bill_status ILIKE 'PAID' THEN 'Paid'
    WHEN bd.bill_status ILIKE 'UNPAID' AND bp.due_date < CURRENT_DATE THEN 'Overdue'
    ELSE 'Pending'
  END
`;

const getBills = async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const result = await pool.query(`
      SELECT
        bd.bill_document_id,
        bd.bill_type,
        bd.bill_generation_date,
        bd.energy_amount,
        bd.total_amount                        AS amount,
        ${statusSQL}                           AS status,
        bp.unit_consumed,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_type)                  AS utility_tag,
        TO_CHAR(bp.bill_period_start, 'Mon YYYY') AS period,
        uc.connection_id,
        uc.connection_name,
        p.payment_date
      FROM bill_document bd
      JOIN utility_connection uc      ON bd.connection_id     = uc.connection_id
      JOIN tariff  t                  ON uc.tariff_id         = t.tariff_id
      JOIN utility u                  ON t.utility_id         = u.utility_id
      LEFT JOIN bill_postpaid bp      ON bd.bill_document_id  = bp.bill_document_id
      LEFT JOIN prepaid_statement ps  ON bd.bill_document_id  = ps.bill_document_id
      LEFT JOIN payment p             ON bd.bill_document_id = p.bill_document_id
      WHERE uc.consumer_id = $1 AND bd.bill_status NOT ILIKE 'CANCELLED'
      ORDER BY bd.bill_generation_date DESC, bd.bill_document_id DESC
      LIMIT $2
    `, [req.user.person_id, limit]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
}

const getBillsById = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        bd.bill_document_id,
        bd.bill_type,
        bd.bill_generation_date,
        bd.energy_amount,
        bd.subtotal,
        bd.vat_rate,
        bd.vat_amount,
        bd.total_amount,
        ${statusSQL}                           AS status,
        bp.unit_consumed,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        TO_CHAR(bp.bill_period_start, 'Mon YYYY') AS period,
        ps.prepaid_token,
        COALESCE(
          json_agg(
            json_build_object(
              'charge_name', f.charge_name, 
              'amount', fca.amount,
              'period', fca.timeframe
            )
          ) FILTER (WHERE f.fixed_charge_id IS NOT NULL),
          '[]'
        ) AS fixed_charges,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)                  AS utility_tag,
        t.tariff_name,
        t.billing_method,
        p.payment_date,
        get_address_text(m.address_id) AS address
      FROM bill_document bd
      JOIN utility_connection uc         ON bd.connection_id     = uc.connection_id
      LEFT JOIN meter m                  ON uc.meter_id          = m.meter_id
      JOIN tariff  t                     ON uc.tariff_id         = t.tariff_id
      JOIN utility u                     ON t.utility_id         = u.utility_id
      LEFT JOIN bill_postpaid bp         ON bd.bill_document_id  = bp.bill_document_id
      LEFT JOIN prepaid_statement ps     ON bd.bill_document_id  = ps.bill_document_id
      LEFT JOIN fixed_charge_applied fca ON bd.bill_document_id  = fca.bill_document_id
      LEFT JOIN fixed_charge f           ON fca.fixed_charge_id  = f.fixed_charge_id
      LEFT JOIN payment p                ON bd.bill_document_id = p.bill_document_id
      WHERE bd.bill_document_id = $1
        AND uc.consumer_id      = $2
      GROUP BY 
        bd.bill_document_id,
        bd.bill_type,
        bd.bill_generation_date,
        bd.energy_amount,
        bd.subtotal,
        bd.vat_rate,
        bd.vat_amount,
        bd.total_amount,
        bp.unit_consumed,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        ps.prepaid_token,
        u.utility_name,
        u.unit_of_measurement,
        t.tariff_name,
        t.billing_method,
        p.payment_date,
        m.address_id
    `, [req.params.id, req.user.person_id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Bill not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
}

const getUsageHistory = async (req, res) => {
  // Supports granularity: 'month' (default) or 'day'.
  // If granularity=day, caller must provide `month` as 'YYYY-MM'.
  const granularity = (req.query.granularity || 'month').toLowerCase();
  const connectionId = req.query.connection_id || null;

  try {
    if (granularity === 'day') {
      const monthStr = req.query.month; // expected format: 'YYYY-MM'
      if (!monthStr)
        return res.status(400).json({ error: 'month query param (YYYY-MM) is required for day granularity' });

      // Build a date for the first day of the month
      const monthStart = `${monthStr}-01`;
      // Prevent asking for a future month
      const monthStartDate = new Date(monthStart);
      const today = new Date();
      if (isNaN(monthStartDate.getTime()))
        return res.status(400).json({ error: 'month must be in YYYY-MM format' });
      if (monthStartDate > today)
        return res.status(400).json({ error: 'month cannot be in the future' });

      const sql = `
        -- Usage grouped by day for specified month (include days with zero usage)
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', $3::date),
            LEAST((date_trunc('month', $3::date) + INTERVAL '1 month' - INTERVAL '1 day')::date, CURRENT_DATE),
            INTERVAL '1 day'
          ) AS day
        ),
        usage_filtered AS (
          SELECT us.*
          FROM usage us
          JOIN utility_connection uc ON us.meter_id = uc.meter_id
          WHERE uc.consumer_id = $1 AND uc.connection_id = $2
        )
        SELECT
          to_char(d.day, 'YYYY-MM-DD') AS day,
          to_char(d.day, 'DD Mon') AS day_name,
          COALESCE(SUM(us.unit_used), 0) AS units_logged,
          COALESCE(SUM(ROUND(us.unit_used * get_rate(us.tariff_id, us.slab_num))), 0) AS cost,
          MAX(u.unit_of_measurement) AS unit_of_measurement
        FROM days d
        LEFT JOIN usage_filtered us
          ON date_trunc('day', us.time_to) = d.day
        LEFT JOIN tariff t ON us.tariff_id = t.tariff_id
        LEFT JOIN utility u ON t.utility_id = u.utility_id
        GROUP BY d.day
        ORDER BY d.day ASC;
      `;

      const params = [req.user.person_id, connectionId, monthStart];
      const result = await pool.query(sql, params);
      return res.json(result.rows);
    }

    // Default: month granularity (last 24 months)
    const result = await pool.query(`
      -- Last 24 months usage per month (includes months with zero usage)
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
        WHERE uc.consumer_id = $1 AND uc.connection_id = $2
      )
      SELECT
        to_char(m.month_start, 'YYYY-MM') AS month,
        to_char(m.month_start, 'Mon YY') AS month_name,
        COALESCE(SUM(us.unit_used), 0) AS units_logged,
        COALESCE(SUM(ROUND(us.unit_used * get_rate(us.tariff_id, us.slab_num))), 0) AS cost,
        MAX(u.unit_of_measurement) AS unit_of_measurement
      FROM months m
      LEFT JOIN usage_filtered us
        ON date_trunc('month', us.time_to) = m.month_start
      LEFT JOIN tariff t ON us.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      GROUP BY m.month_start
      ORDER BY m.month_start ASC;
    `, [req.user.person_id, connectionId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
}

const getComplaints = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.complaint_id,
        c.description,
        c.status,
        c.complaint_date,
        c.assignment_date,
        c.resolution_date,
        c.remarks,
        c.connection_id,
        uc.connection_name,
        u.utility_name,
        LOWER(u.utility_name) AS utility_tag
      FROM complaint c
      LEFT JOIN utility_connection uc ON c.connection_id = uc.connection_id
      LEFT JOIN tariff  t             ON uc.tariff_id   = t.tariff_id
      LEFT JOIN utility u             ON t.utility_id   = u.utility_id
      WHERE c.consumer_id = $1
      ORDER BY c.complaint_date DESC
    `, [req.user.person_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
}

const submitComplaint = async (req, res) => {
  const { connection_id, description } = req.body;
  if (!description)
    return res.status(400).json({ error: 'Description is required' });

  try {
    const result = await pool.query(`
      INSERT INTO complaint (consumer_id, connection_id, description, status, complaint_date)
      VALUES ($1, $2, $3, 'Pending', CURRENT_TIMESTAMP)
      RETURNING *
    `, [req.user.person_id, connection_id || null, description]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit complaint' });
  }
}

const getApplications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        ca.application_id,
        ca.application_date,
        ca.status,
        ca.requested_connection_type,
        ca.address,
        ca.review_date,
        ca.approval_date,
        ca.priority,
        u.utility_name,
        u.utility_type,
        r.region_name,
        p.first_name || ' ' || p.last_name AS reviewed_by_name
      FROM connection_application ca
      LEFT JOIN employee e  ON ca.reviewed_by = e.person_id
      LEFT JOIN person   p  ON e.person_id    = p.person_id
      LEFT JOIN utility  u  ON ca.utility_id  = u.utility_id
      LEFT JOIN region   r  ON ca.region_id   = r.region_id
      WHERE ca.consumer_id = $1
      ORDER BY ca.application_date DESC
    `, [req.user.person_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}

const submitApplication = async (req, res) => {
  const { utility_id, region_id, requested_connection_type, address, priority } = req.body;

  if (!utility_id || !region_id || !requested_connection_type || !address)
    return res.status(400).json({ error: 'utility_id, region_id, requested_connection_type and address are required' });

  try {
    const result = await pool.query(`
      INSERT INTO connection_application
        (consumer_id, utility_id, region_id, requested_connection_type, address, priority, status, application_date)
      VALUES ($1, $2, $3, $4, $5, $6, 'Pending', CURRENT_DATE)
      RETURNING *
    `, [req.user.person_id, utility_id, region_id, requested_connection_type, address, priority || 'Normal']);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
}

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(`
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
      WHERE p.person_id = $1 AND a.account_type ILIKE 'CONSUMER'
    `, [req.user.person_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

const deactivateAccount = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password confirmation required' });

  const bcrypt = require('bcrypt');
  try {
    const result = await pool.query(
      `SELECT password_hashed FROM account WHERE person_id = $1 AND account_type = $2`,
      [req.user.person_id, req.user.role]
    );
    const valid = await bcrypt.compare(password, result.rows[0].password_hashed);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    await pool.query(
      `UPDATE account SET is_active = FALSE WHERE person_id = $1 AND account_type = $2`,
      [req.user.person_id, req.user.role]
    );
    res.json({ message: 'Account deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate account' });
  }
}

const getPaymentMethods = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pm.method_id, pm.method_name, pm.is_default,
        bn.bank_name, b.account_num,
        mbp.provider_name, mb.phone_num AS mb_phone,
        gp.email, gp.phone_num AS gp_phone
      FROM payment_method pm
      LEFT JOIN bank                    b   ON pm.method_id = b.method_id
      LEFT JOIN bank_name               bn  ON b.bank_id = bn.bank_id
      LEFT JOIN mobile_banking          mb  ON pm.method_id = mb.method_id
      LEFT JOIN mobile_banking_provider mbp ON mb.provider_id = mbp.provider_id
      LEFT JOIN google_pay    gp ON pm.method_id = gp.method_id
      WHERE pm.consumer_id = $1
      ORDER BY pm.is_default DESC, pm.method_id ASC
    `, [req.user.person_id]);
    res.json(result.rows);
    // console.log(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
};

const addPaymentMethod = async (req, res) => {
  const { method_name, bank_name, account_num, provider_name, phone_num, email, set_default } = req.body;
  if (!method_name) return res.status(400).json({ error: 'method_name is required' });

  try {
    const q = `SELECT add_payment_method($1,$2,$3,$4,$5,$6,$7,$8) AS method_id`;
    const params = [method_name, req.user.person_id, bank_name, account_num, provider_name, phone_num, email, set_default];
    const result = await pool.query(q, params);
    const methodId = result.rows[0].method_id;
    res.status(201).json({ message: 'Payment method added', method_id: methodId });
  } catch (error) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to add payment method' });
  }
  

  // const client = await pool.connect();
  // try {
  //   await client.query('BEGIN');

  //   // If setting as default, unset existing default
  //   if (set_default) {
  //     await client.query(
  //       `UPDATE payment_method SET is_default = FALSE WHERE consumer_id = $1`,
  //       [req.user.person_id]
  //     );
  //   }

  //   const methodRes = await client.query(
  //     `INSERT INTO payment_method (method_name, consumer_id, is_default) VALUES ($1, $2, $3) RETURNING method_id`,
  //     [method_name, req.user.person_id, set_default || false]
  //   );
  //   const methodId = methodRes.rows[0].method_id;

  //   if (method_name === 'bank') {
  //     if (!bank_name || !account_num) throw new Error('bank_name and account_num are required');
  //     await client.query(
  //       `INSERT INTO bank (method_id, bank_id, account_num) VALUES ($1, (SELECT bank_id FROM bank_name WHERE bank_name = $2), $3)`,
  //       [methodId, bank_name, account_num]
  //     );
  //   } else if (method_name === 'mobile_banking') {
  //     if (!provider_name || !phone_num) throw new Error('provider_name and phone_num are required');
  //     await client.query(
  //       `INSERT INTO mobile_banking (method_id, provider_id, phone_num) VALUES ($1, (SELECT provider_id FROM mobile_banking_provider WHERE provider_name = $2), $3)`,
  //       [methodId, provider_name, phone_num]
  //     );
  //   } else if (method_name === 'google_pay') {
  //     if (!google_account_email) throw new Error('google_account_email is required');
  //     await client.query(
  //       `INSERT INTO google_pay (method_id, email, phone_num) VALUES ($1, $2, $3)`,
  //       [methodId, google_account_email, phone_num || null]
  //     );
  //   } else {
  //     throw new Error('Invalid method_name');
  //   }

  //   await client.query('COMMIT');
  //   res.status(201).json({ message: 'Payment method added', method_id: methodId });
  // } catch (err) {
  //   await client.query('ROLLBACK');
  //   console.error(err);
  //   res.status(400).json({ error: err.message || 'Failed to add payment method' });
  // } finally {
  //   client.release();
  // }
}

const setDefaultPaymentMethod = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE payment_method SET is_default = FALSE WHERE consumer_id = $1`,
      [req.user.person_id]
    );
    await client.query(
      `UPDATE payment_method SET is_default = TRUE WHERE method_id = $1 AND consumer_id = $2`,
      [req.params.id, req.user.person_id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Default updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update default' });
  } finally {
    client.release();
  }
}

const deletePaymentMethod = async (req, res) => {
  try {
    const result = await pool.query(
      // `DELETE FROM payment_method WHERE method_id = $1 AND consumer_id = $2 RETURNING method_id`,
      `UPDATE payment_method SET consumer_id = NULL WHERE method_id = $1 AND consumer_id = $2 RETURNING method_id`,
      [req.params.id, req.user.person_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Payment method not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete' });
  }
}

const makePayment = async (req, res) => {
  // const { bill_document_id, payment_amount, payment_method, provider_name, phone_num, account_num } = req.body;
  // if (!bill_document_id || !payment_amount || !payment_method)
  //   return res.status(400).json({ error: 'bill_document_id, payment_amount, and payment_method are required' });

  const { bill_document_id, method_id, payment_amount } = req.body;
  if (!bill_document_id || !method_id || !payment_amount)
    return res.status(400).json({ error: 'bill_document_id, method_id and payment_amount are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify bill belongs to this consumer and isn't already paid
    const billCheck = await client.query(`
      SELECT bd.bill_document_id, bd.bill_status, uc.consumer_id
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      WHERE bd.bill_document_id = $1 AND uc.consumer_id = $2 AND bd.bill_status NOT ILIKE 'PAID'
    `, [bill_document_id, req.user.person_id]);

    if (billCheck.rows.length === 0)
      return res.status(404).json({ error: 'Bill not found' });
    if (billCheck.rows[0].bill_status.toLowerCase() === 'paid')
      return res.status(400).json({ error: 'Bill already paid' });

    // // Payment method
    // const methodRes = await client.query(
    //   `INSERT INTO payment_method (method_name) VALUES ($1) RETURNING method_id`,
    //   [payment_method]
    // );
    // const methodId = methodRes.rows[0].method_id;

    // if (payment_method === 'mobile_banking') {
    //   await client.query(
    //     `INSERT INTO mobile_banking (method_id, provider_name, phone_num) VALUES ($1, $2, $3)`,
    //     [methodId, provider_name || 'bKash', phone_num]
    //   );
    // } else if (payment_method === 'bank') {
    //   await client.query(
    //     `INSERT INTO bank (method_id, bank_name, account_num) VALUES ($1, $2, $3)`,
    //     [methodId, provider_name || 'Unknown', account_num || phone_num]
    //   );
    // }

    // Insert payment — trigger fires and sets bill_document.bill_status = 'PAID'
    const paymentRes = await client.query(`
      INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Completed')
      RETURNING payment_id
    `, [bill_document_id, method_id, payment_amount]);

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Payment successful',
      payment_id: paymentRes.rows[0].payment_id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Payment failed' });
  } finally {
    client.release();
  }
}

const getPaymentHistory = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.payment_id, p.bill_document_id, p.payment_amount, p.payment_date, p.status,
        pm.method_name, pm.is_default,
        bn.bank_name,   b.account_num,
        mbp.provider_name, mb.phone_num AS mb_phone,
        gp.email,
        bd.total_amount, bd.bill_generation_date,
        LOWER(u.utility_name) AS utility_name
      FROM payment p
      JOIN payment_method   pm ON p.method_id       = pm.method_id
      JOIN bill_document    bd ON p.bill_document_id = bd.bill_document_id
      JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      JOIN tariff           t  ON uc.tariff_id       = t.tariff_id
      JOIN utility          u  ON t.utility_id       = u.utility_id
      LEFT JOIN bank                    b   ON pm.method_id = b.method_id
      LEFT JOIN bank_name               bn  ON b.bank_id = bn.bank_id
      LEFT JOIN mobile_banking          mb  ON pm.method_id = mb.method_id
      LEFT JOIN mobile_banking_provider mbp ON mb.provider_id = mbp.provider_id
      LEFT JOIN google_pay              gp  ON pm.method_id = gp.method_id
      WHERE uc.consumer_id = $1
      ORDER BY p.payment_date DESC
      LIMIT 50
    `, [req.user.person_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
}

const createBillForRecharge = async (req, res) => {
  const { id, amount } = req.body; // id -> prepaid_account_id
  const client = await pool.connect();
  try {
    // Verify prepaid account belongs to this consumer
    const check = await client.query(`
      SELECT pa.prepaid_account_id
      FROM prepaid_account pa
      JOIN utility_connection uc ON pa.connection_id = uc.connection_id
      WHERE pa.prepaid_account_id = $1 AND uc.consumer_id = $2
    `, [id, req.user.person_id]);

    if (check.rows.length === 0)
      return res.status(404).json({ error: 'Prepaid account not found' });

    const result = await client.query(`
      SELECT create_prepaid_statement($1, $2) AS bill_document_id
    `, [id, amount]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recharge failed' });
  }
}


module.exports = {
  getConnections,
  getConnectionDetails,
  getBills,
  getBillsById,
  getUsageHistory,
  makePayment,
  getComplaints,
  submitComplaint,
  getApplications,
  submitApplication,
  getProfile,
  deactivateAccount,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  getPaymentHistory,
  createBillForRecharge
};