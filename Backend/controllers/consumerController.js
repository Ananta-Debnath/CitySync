const pool = require("../db");
const { get } = require("../routes/consumer");



const getPerson = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM person
      WHERE person_id = $1
    `, [req.user.person_id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch person details' });
  }
}

const getConnections = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        uc.connection_id,
        uc.connection_status,
        uc.connection_date,
        uc.payment_type,
        uc.connection_type,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)   AS utility_tag,
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
        ), 0) AS units_used -- usage for current month
      FROM utility_connection uc
      JOIN tariff  t  ON uc.tariff_id  = t.tariff_id
      JOIN utility u  ON t.utility_id  = u.utility_id
      JOIN meter   m  ON uc.meter_id   = m.meter_id
      JOIN address a  ON m.address_id  = a.address_id
      JOIN region  r  ON a.region_id   = r.region_id
      WHERE uc.consumer_id = $1
      ORDER BY uc.connection_date DESC
    `, [req.user.person_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch connections' });
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
        bd.unit_consumed,
        bd.energy_amount,
        bd.total_amount                        AS amount,
        ${statusSQL}                           AS status,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)                  AS utility_tag,
        TO_CHAR(bp.bill_period_start, 'Mon YYYY') AS period,
        uc.connection_id
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id     = uc.connection_id
      JOIN tariff  t              ON uc.tariff_id         = t.tariff_id
      JOIN utility u              ON t.utility_id         = u.utility_id
      RIGHT JOIN bill_postpaid bp  ON bd.bill_document_id  = bp.bill_document_id
      WHERE uc.consumer_id = $1
      ORDER BY bd.bill_generation_date DESC
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
        bd.unit_consumed,
        bd.energy_amount,
        bd.total_amount,
        ${statusSQL}                           AS status,
        bp.bill_period_start,
        bp.bill_period_end,
        bp.due_date,
        bp.remarks,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)                  AS utility_tag,
        TO_CHAR(bp.bill_period_start, 'Mon YYYY') AS period,
        t.tariff_name,
        t.billing_method,
        uc.connection_id,
        uc.payment_type
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id     = uc.connection_id
      JOIN tariff  t              ON uc.tariff_id         = t.tariff_id
      JOIN utility u              ON t.utility_id         = u.utility_id
      LEFT JOIN bill_postpaid bp  ON bd.bill_document_id  = bp.bill_document_id
      WHERE bd.bill_document_id = $1
        AND uc.consumer_id      = $2
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
  try {
    const result = await pool.query(`
      SELECT
        us.meter_id,
        us.usage_id,
        us.unit_used                        AS units_logged,
        us.time_from,
        us.time_to,
        us.tariff_id,
        us.slab_num,
        get_rate(us.tariff_id, us.slab_num) AS rate,
        ROUND(us.unit_used * get_rate(us.tariff_id, us.slab_num)) AS cost,
        u.utility_name,
        u.unit_of_measurement,
        LOWER(u.utility_name)               AS utility_tag
      FROM usage us
      JOIN utility_connection uc ON us.meter_id  = uc.meter_id
      JOIN tariff  t             ON uc.tariff_id = t.tariff_id
      JOIN utility u             ON t.utility_id = u.utility_id
      WHERE uc.consumer_id = $1
      ORDER BY us.time_to DESC
      LIMIT 60
    `, [req.user.person_id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
}

const makePayment = async (req, res) => {
  const { bill_document_id, payment_amount, payment_method, provider_name, phone_num, account_num } = req.body;

  if (!bill_document_id || !payment_amount || !payment_method)
    return res.status(400).json({ error: 'bill_document_id, payment_amount, and payment_method are required' });

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

    // Payment method
    const methodRes = await client.query(
      `INSERT INTO payment_method (method_name) VALUES ($1) RETURNING method_id`,
      [payment_method]
    );
    const methodId = methodRes.rows[0].method_id;

    if (payment_method === 'mobile_banking') {
      await client.query(
        `INSERT INTO mobile_banking (method_id, provider_name, phone_num) VALUES ($1, $2, $3)`,
        [methodId, provider_name || 'bKash', phone_num]
      );
    } else if (payment_method === 'bank') {
      await client.query(
        `INSERT INTO bank (method_id, bank_name, account_num) VALUES ($1, $2, $3)`,
        [methodId, provider_name || 'Unknown', account_num || phone_num]
      );
    }

    // Insert payment — trigger fires and sets bill_document.bill_status = 'PAID'
    const paymentRes = await client.query(`
      INSERT INTO payment (bill_document_id, method_id, payment_amount, payment_date, status)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'Completed')
      RETURNING payment_id
    `, [bill_document_id, methodId, payment_amount]);

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



module.exports = {
    getConnections,
    getBills,
    getPerson,
    getBillsById,
    getUsageHistory,
    makePayment,
};