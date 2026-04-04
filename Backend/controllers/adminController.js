const bcrypt = require('bcrypt');
const pool = require('../db');

const getTableStats = async (tableName) => {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(r.rows[0].count, 10);
  } catch {
    return 0;
  }
};

const ALLOWED_TABLES = {
  region: 'region_id',
  address: 'address_id',
  person: 'person_id',
  account: 'account_id',
  consumer: 'person_id',
  employee: 'person_id',
  utility: 'utility_id',
  utility_connection: 'connection_id',
  meter: 'meter_id',
  bill_document: 'bill_document_id',
  payment: 'payment_id',
  complaint: 'complaint_id',
  tariff: 'tariff_id'
};

const getTables = async (req, res) => {
  try {
    const tables = [
      'region', 'address', 'person', 'account', 'consumer', 'employee',
      'field_worker', 'utility', 'electricity_utility', 'water_utility',
      'gas_utility', 'tariff', 'tariff_slab', 'utility_connection',
      'residential_connection', 'commercial_connection', 'meter',
      'meter_reading', 'usage', 'bill_document', 'bill_postpaid',
      'prepaid_statement', 'prepaid_account', 'balance_transaction',
      'payment_method', 'bank', 'mobile_banking', 'paypal',
      'payment', 'complaint'
    ];
    const tableStats = await Promise.all(
      tables.map(async (t) => ({ name: t, count: await getTableStats(t) }))
    );
    res.json({ tables: tableStats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch table stats' });
  }
};

const createRegion = async (req, res) => {
  const { region_name, postal_code } = req.body;
  if (!region_name || !postal_code) {
    return res.status(400).json({ error: 'region_name and postal_code are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO region (region_name, postal_code) VALUES ($1, $2) RETURNING *`,
      [region_name, postal_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const updateRegion = async (req, res) => {
  const { id } = req.params;
  const { region_name, postal_code } = req.body;
  try {
    const result = await pool.query(
      `UPDATE region
       SET region_name = COALESCE($1, region_name),
           postal_code = COALESCE($2, postal_code)
       WHERE region_id = $3 RETURNING *`,
      [region_name, postal_code, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const deleteRegion = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM region WHERE region_id = $1', [id]);
    res.json({ message: 'Region deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot delete — region may be in use', detail: err.message });
  }
};

const getAddresses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, r.region_name, r.postal_code
      FROM address a LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY a.address_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getPersons = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, a.house_num, a.street_name, a.landmark, r.region_name, r.postal_code
      FROM person p
      LEFT JOIN address a ON p.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY p.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getUtilities = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM utility ORDER BY utility_id');
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getConsumers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, p.first_name, p.last_name, p.phone_number, p.date_of_birth,
             acc.email, acc.is_active
      FROM consumer c
      JOIN person p ON c.person_id = p.person_id
      LEFT JOIN account acc ON p.person_id = acc.person_id
      WHERE account_type ILIKE 'Consumer'
      ORDER BY c.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const updateConsumer = async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, phone_number, email } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE person
      SET first_name    = COALESCE($1, first_name),
          last_name     = COALESCE($2, last_name),
          phone_number  = COALESCE($3, phone_number)
      WHERE person_id = $4`,
      [first_name, last_name, phone_number, id]
    );
    if (email) {
      await client.query(`UPDATE account SET email = $1 WHERE person_id = $2`, [email, id]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Consumer updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
};

const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, p.first_name, p.last_name, p.phone_number
      FROM employee e JOIN person p ON e.person_id = p.person_id
      ORDER BY e.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getFieldWorkers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fw.*, p.first_name, p.last_name, p.phone_number, r.region_name
      FROM field_worker fw
      JOIN person p ON fw.person_id = p.person_id
      LEFT JOIN region r ON fw.assigned_region_id = r.region_id
      ORDER BY fw.person_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getTariffs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.utility_name, u.unit_of_measurement
      FROM tariff t LEFT JOIN utility u ON t.utility_id = u.utility_id
      ORDER BY t.tariff_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const createTariff = async (req, res) => {
  const {
    tariff_name,
    utility_id,
    consumer_category,
    billing_method,
    effective_from,
    effective_to,
    is_active,
    vat_rate,
    is_vat_exempt
  } = req.body;

  if (!tariff_name || !utility_id || !consumer_category || !billing_method || !effective_from) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tariff (tariff_name, utility_id, consumer_category, billing_method, effective_from, effective_to, is_active, vat_rate, is_vat_exempt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [tariff_name, utility_id, consumer_category, billing_method, effective_from, effective_to || null, is_active ?? true, vat_rate ?? 5.00, is_vat_exempt ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const deactivateTariff = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE tariff
       SET is_active = false,
           effective_to = CURRENT_DATE
       WHERE tariff_id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tariff not found' });
    res.json({ success: true, message: 'Tariff deactivated', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const updateTariff = async (req, res) => {
  const { id } = req.params;
  const { tariff_name, consumer_category, billing_method, effective_from, effective_to, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tariff
      SET tariff_name       = COALESCE($1, tariff_name),
          consumer_category = COALESCE($2, consumer_category),
          billing_method    = COALESCE($3, billing_method),
          effective_from    = COALESCE($4, effective_from),
          effective_to      = $5,
          is_active         = COALESCE($6, is_active)
      WHERE tariff_id = $7 RETURNING *`,
      [tariff_name, consumer_category, billing_method, effective_from, effective_to || null, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tariff not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getTariffSlabs = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM tariff_slab WHERE tariff_id = $1 ORDER BY slab_num`,
      [id]
    );
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const createTariffSlab = async (req, res) => {
  const { id } = req.params;
  const { charge_type, unit_from, unit_to, rate_per_unit } = req.body;
  if (unit_from === undefined || rate_per_unit === undefined) {
    return res.status(400).json({ error: 'unit_from and rate_per_unit are required' });
  }
  try {
    const numResult = await pool.query(
      `SELECT COALESCE(MAX(slab_num), 0) + 1 AS next_num FROM tariff_slab WHERE tariff_id = $1`,
      [id]
    );
    const slab_num = numResult.rows[0].next_num;
    const result = await pool.query(
      `INSERT INTO tariff_slab (tariff_id, slab_num, charge_type, unit_from, unit_to, rate_per_unit)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, slab_num, charge_type || 'FLAT', unit_from, unit_to || null, rate_per_unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const updateTariffSlab = async (req, res) => {
  const { id, slabNum } = req.params;
  const { charge_type, unit_from, unit_to, rate_per_unit } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tariff_slab
      SET charge_type    = COALESCE($1, charge_type),
          unit_from      = COALESCE($2, unit_from),
          unit_to        = $3,
          rate_per_unit  = COALESCE($4, rate_per_unit)
      WHERE tariff_id = $5 AND slab_num = $6 RETURNING *`,
      [charge_type, unit_from, unit_to || null, rate_per_unit, id, slabNum]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Slab not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const deleteTariffSlab = async (req, res) => {
  const { id, slabNum } = req.params;
  try {
    await pool.query(`DELETE FROM tariff_slab WHERE tariff_id = $1 AND slab_num = $2`, [id, slabNum]);
    res.json({ message: 'Slab deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete slab — may be referenced by readings', detail: err.message });
  }
};

const getTariffFixedCharges = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM fixed_charge WHERE tariff_id = $1 ORDER BY fixed_charge_id`,
      [id]
    );
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const createTariffFixedCharge = async (req, res) => {
  const { id } = req.params;
  const { charge_name, charge_amount, charge_frequency, is_mandatory } = req.body;
  if (!charge_amount || !charge_frequency) {
    return res.status(400).json({ error: 'charge_amount and charge_frequency are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO fixed_charge (tariff_id, charge_name, charge_amount, charge_frequency, is_mandatory)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, charge_name || null, charge_amount, charge_frequency, is_mandatory ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const deleteTariffFixedCharge = async (req, res) => {
  const { fcId } = req.params;
  try {
    await pool.query(`DELETE FROM fixed_charge WHERE fixed_charge_id = $1`, [fcId]);
    res.json({ message: 'Fixed charge deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete — may be applied to bills', detail: err.message });
  }
};

const getMeters = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, a.house_num, a.street_name, r.region_name,
             uc.connection_id, uc.connection_status
      FROM meter m
      LEFT JOIN address a ON m.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      LEFT JOIN utility_connection uc ON uc.meter_id = m.meter_id
      ORDER BY m.meter_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const createMeter = async (req, res) => {
  const { address_id, meter_type } = req.body;
  if (!address_id || !meter_type) {
    return res.status(400).json({ error: 'address_id and meter_type are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO meter (address_id, meter_type, is_active) VALUES ($1, $2, FALSE) RETURNING *`,
      [address_id, meter_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getConnections = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        uc.*, 
        p.first_name, p.last_name,
        u.utility_name,
        get_address_text(m.address_id) AS address,
        r.region_name,
        t.tariff_name
      FROM utility_connection uc
      LEFT JOIN consumer c ON uc.consumer_id = c.person_id
      LEFT JOIN person p ON c.person_id = p.person_id
      LEFT JOIN tariff t ON uc.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      LEFT JOIN meter m ON uc.meter_id = m.meter_id
      LEFT JOIN address a ON m.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      ORDER BY uc.connection_id
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const createConnection = async (req, res) => {
  const {
    consumer_id,
    tariff_id,
    meter_id,
    payment_type,
    connection_type,
    load_requirement,
    property_type,
    is_subsidized,
    business_name,
    operating_hours,
    tax_id
  } = req.body;

  if (!consumer_id || !tariff_id || !meter_id || !payment_type || !connection_type) {
    return res.status(400).json({ error: 'consumer_id, tariff_id, meter_id, payment_type, connection_type are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const connResult = await client.query(
      `INSERT INTO utility_connection
        (tariff_id, consumer_id, meter_id, payment_type, connection_type, connection_status, connection_date, load_requirement)
      VALUES ($1, $2, $3, $4, $5, 'Active', CURRENT_DATE, $6)
      RETURNING *`,
      [tariff_id, consumer_id, meter_id, payment_type, connection_type, load_requirement || null]
    );

    const connection_id = connResult.rows[0].connection_id;

    if (connection_type.toLowerCase() === 'residential') {
      await client.query(
        `INSERT INTO residential_connection (connection_id, property_type, is_subsidized)
        VALUES ($1, $2, $3)`,
        [connection_id, property_type || null, is_subsidized ?? false]
      );
    } else if (connection_type.toLowerCase() === 'commercial') {
      await client.query(
        `INSERT INTO commercial_connection (connection_id, business_name, operating_hours, tax_id)
        VALUES ($1, $2, $3, $4)`,
        [connection_id, business_name || null, operating_hours || null, tax_id || null]
      );
    }

    await client.query(`UPDATE meter SET is_active = TRUE WHERE meter_id = $1`, [meter_id]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Connection created', connection_id, data: connResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create connection' });
  } finally {
    client.release();
  }
};

const updateConnectionStatus = async (req, res) => {
  const { id } = req.params;
  const { connection_status } = req.body;
  if (!connection_status) return res.status(400).json({ error: 'connection_status is required' });
  try {
    const result = await pool.query(
      `UPDATE utility_connection SET connection_status = $1 WHERE connection_id = $2 RETURNING *`,
      [connection_status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Connection not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getApplications = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ca.*, 
        u.utility_name,
        u.utility_type,
        CONCAT(ca.address, ', ', r.region_name, '-', r.postal_code) AS full_address,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        p.phone_number as consumer_phone,
        e.first_name as reviewer_first_name,
        e.last_name as reviewer_last_name
      FROM connection_application ca
      JOIN utility u ON ca.utility_id = u.utility_id
      JOIN region r ON ca.region_id = r.region_id
      JOIN consumer c ON ca.consumer_id = c.person_id
      JOIN person p ON c.person_id = p.person_id
      LEFT JOIN employee emp ON ca.reviewed_by = emp.person_id
      LEFT JOIN person e ON emp.person_id = e.person_id
      ORDER BY ca.application_date DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const reviewed_by = req.user.person_id;
    const result = await pool.query(
      `UPDATE connection_application
      SET status        = $1,
          reviewed_by   = $2,
          review_date   = CURRENT_DATE
          ${status === 'Approved' ? ', approval_date = CURRENT_DATE' : ''}
      WHERE application_id = $3 RETURNING *`,
      [status, reviewed_by, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getComplaints = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        comp.*,
        p.first_name  as consumer_first_name,
        p.last_name   as consumer_last_name,
        p.phone_number as consumer_phone,
        e1.first_name as assigned_by_name,
        fw_p.first_name || ' ' || fw_p.last_name as assigned_to_name,
        r.region_id,
        r.region_name
      FROM complaint comp
      LEFT JOIN consumer c ON comp.consumer_id = c.person_id
      LEFT JOIN person p ON c.person_id = p.person_id
      LEFT JOIN employee emp1 ON comp.assigned_by = emp1.person_id
      LEFT JOIN person e1 ON emp1.person_id = e1.person_id
      LEFT JOIN field_worker fw ON comp.assigned_to = fw.person_id
      LEFT JOIN person fw_p ON fw.person_id = fw_p.person_id
      LEFT JOIN utility_connection uc ON comp.connection_id = uc.connection_id
      LEFT JOIN meter m ON uc.meter_id = m.meter_id
      LEFT JOIN address a ON m.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      WHERE comp.status NOT ILIKE 'Resolved'
      ORDER BY comp.status DESC, comp.complaint_date DESC-- , comp.complaint_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const assignComplaintAuto = async (req, res) => {
  const { id: complaintId } = req.params;
  const { priority = 'Normal' } = req.body;
  const assigned_by = req.user.person_id;

  try {
    // Step 1: Get complaint region.
    // Prefer region from connection->meter->address; fall back to the
    // complainant's person->address->region for general complaints.
    const complaintResult = await pool.query(`
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
      WHERE c.complaint_id = $1
    `, [complaintId]);

    if (complaintResult.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const { region_id, region_name } = complaintResult.rows[0];

    if (!region_id) {
      return res.status(400).json({ error: 'Complaint has no region (no linked connection or person address)' });
    }

    // Step 2: Find best field worker based on priority
    let fieldWorkerQuery;
    if (priority === 'Urgent') {
      fieldWorkerQuery = `
        SELECT fws.person_id, fws.first_name, fws.last_name,
               fws.active_assignments, fws.total_resolved,
               fws.resolution_rate, fws.avg_resolution_days
        FROM field_worker_stats fws
        WHERE fws.assigned_region_id = $1
        ORDER BY
          fws.resolution_rate DESC NULLS LAST,
          fws.avg_resolution_days ASC NULLS LAST,
          fws.total_resolved DESC,
          fws.active_assignments ASC
        LIMIT 1
      `;
    } else {
      fieldWorkerQuery = `
        SELECT fws.person_id, fws.first_name, fws.last_name,
               fws.active_assignments, fws.total_resolved
        FROM field_worker_stats fws
        WHERE fws.assigned_region_id = $1
        ORDER BY
          fws.active_assignments ASC,
          fws.total_resolved DESC
        LIMIT 1
      `;
    }

    const workerResult = await pool.query(fieldWorkerQuery, [region_id]);

    if (workerResult.rows.length === 0) {
      return res.status(404).json({ error: `No field workers available in region: ${region_name}` });
    }

    const selectedWorker = workerResult.rows[0];

    // Step 3: Assign complaint
    const updateResult = await pool.query(`
      UPDATE complaint
      SET assigned_to = $1, assigned_by = $2, assignment_date = CURRENT_DATE,
          status = 'In Progress', priority = $3
      WHERE complaint_id = $4
      RETURNING *
    `, [selectedWorker.person_id, assigned_by, priority, complaintId]);

    return res.status(200).json({
      success: true,
      message: `Complaint assigned to ${selectedWorker.first_name} ${selectedWorker.last_name}`,
      data: {
        complaint: updateResult.rows[0],
        assigned_worker: selectedWorker,
        region: region_name
      }
    });
  } catch (err) {
    console.error('Auto-assign error:', err);
    res.status(500).json({ error: 'Failed to assign complaint', details: err.message });
  }
};

const assignComplaint = async (req, res) => {
  const { id } = req.params;
  const { assigned_to } = req.body;
  if (!assigned_to) return res.status(400).json({ error: 'assigned_to is required' });
  try {
    const assigned_by = req.user.person_id;
    const result = await pool.query(
      `UPDATE complaint
      SET assigned_to = $1, assigned_by = $2, assignment_date = CURRENT_DATE, status = 'In Progress'
      WHERE complaint_id = $3 RETURNING *`,
      [assigned_to, assigned_by, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const updateComplaintStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!status) return res.status(400).json({ error: 'status is required' });
  try {
    const result = await pool.query(
      `UPDATE complaint
      SET status = $1,
          remarks = COALESCE($2, remarks)
          ${status === 'Resolved' ? ', resolution_date = CURRENT_DATE' : ''}
      WHERE complaint_id = $3 RETURNING *`,
      [status, remarks || null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const approveComplaintChange = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const complaintResult = await client.query(
      `SELECT complaint_id, consumer_id, description
       FROM complaint
       WHERE complaint_id = $1`,
      [id]
    );

    if (complaintResult.rows.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const description = complaintResult.rows[0].description || '';
    const match = description.match(
      /^CHANGE REQUEST\s*-\s*(.*?);\s*Current:\s*(.*?);\s*Requested:\s*(.*?);\s*Reason:\s*(.*)$/i
    );

    if (!match) {
      return res.status(400).json({ error: 'Complaint is not a valid change request format' });
    }

    const field = match[1]?.trim();
    const requestValue = match[3]?.trim();
    const fieldKey = field.toLowerCase();

    if (!requestValue) {
      return res.status(400).json({ error: 'Requested value is missing in complaint description' });
    }

    const consumerId = complaintResult.rows[0].consumer_id;
    if (!consumerId) {
      return res.status(400).json({ error: 'Complaint has no consumer linked' });
    }

    await client.query('BEGIN');

    const personResult = await client.query(
      `SELECT p.person_id, p.address_id
       FROM consumer c
       JOIN person p ON c.person_id = p.person_id
       WHERE c.person_id = $1`,
      [consumerId]
    );

    if (personResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Consumer profile not found' });
    }

    const { person_id, address_id } = personResult.rows[0];
    let updateData = null;

    if (fieldKey === 'email') {
      const emailResult = await client.query(
        `UPDATE account
         SET email = $1
         WHERE person_id = $2 AND account_type ILIKE 'Consumer'
         RETURNING person_id, email`,
        [requestValue, person_id]
      );

      if (emailResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Account not found for consumer' });
      }

      updateData = { type: 'email', data: emailResult.rows[0] };
    } else if (fieldKey === 'address') {
      if (!address_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Consumer has no address linked' });
      }

      const parts = requestValue.split(',').map((s) => s.trim());
      if (parts.length < 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Address must be formatted as house_num, street_name, landmark' });
      }

      const house_num = parts[0];
      const street_name = parts[1];
      const landmark = parts.slice(2).join(', ') || null;

      const addressResult = await client.query(
        `UPDATE address
         SET house_num = $1,
             street_name = $2,
             landmark = $3
         WHERE address_id = $4
         RETURNING address_id, house_num, street_name, landmark, region_id`,
        [house_num, street_name, landmark, address_id]
      );

      if (addressResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Address record not found' });
      }

      updateData = { type: 'address', data: addressResult.rows[0] };
    } else if (fieldKey === 'region') {
      if (!address_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Consumer has no address linked' });
      }

      const parts = requestValue.split(',').map((s) => s.trim());
      if (parts.length < 2) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Region must be formatted as region_name, postal_code' });
      }

      const region_name = parts[0];
      const postal_code = parts.slice(1).join(', ').trim();

      const regionResult = await client.query(
        `SELECT region_id, region_name, postal_code
         FROM region
         WHERE LOWER(TRIM(region_name)) = LOWER(TRIM($1))
           AND TRIM(postal_code) = TRIM($2)
         LIMIT 1`,
        [region_name, postal_code]
      );

      if (regionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Requested region not found' });
      }

      const selectedRegion = regionResult.rows[0];

      const addressRes = await client.query(
        `INSERT INTO address (house_num, street_name, landmark, region_id)
         SELECT house_num, street_name, landmark, $1
         FROM address
         WHERE address_id = $2
         RETURNING address_id`,
        [selectedRegion.region_id, address_id]
      );

      const newAddressId = addressRes.rows[0].address_id;

      console.log('New address created with ID:', newAddressId, "for person:", person_id);
      const personUpdateResult = await client.query(
        `UPDATE person SET address_id = $1 WHERE person_id = $2
         RETURNING person_id`,
        [newAddressId, person_id]
      );

      if (personUpdateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Person not found' });
      }

      updateData = {
        type: 'region',
        data: {
          ...personUpdateResult.rows[0],
          region_name: selectedRegion.region_name,
          postal_code: selectedRegion.postal_code
        }
      };
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Unsupported change field: ${field}` });
    }

    await client.query(
      `UPDATE complaint
       SET status = 'Resolved',
           resolution_date = CURRENT_DATE,
           remarks = CASE
             WHEN remarks IS NULL OR remarks = '' THEN 'Change request approved and applied'
             ELSE remarks || ' | Change request approved and applied'
           END
       WHERE complaint_id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Complaint change approved and applied',
      complaint_id: complaintResult.rows[0].complaint_id,
      parsed_change: {
        field,
        request_value: requestValue
      },
      applied_update: updateData
    });

  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed:', rollbackErr);
    }
    console.error('approveComplaintChange error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
};

const getBills = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        bd.*,
        p.first_name, p.last_name,
        u.utility_name,
        bp.bill_period_start, bp.bill_period_end, bp.due_date, bp.remarks,
        uc.payment_type
      FROM bill_document bd
      LEFT JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      LEFT JOIN consumer cons ON uc.consumer_id = cons.person_id
      LEFT JOIN person p ON cons.person_id = p.person_id
      LEFT JOIN tariff t ON uc.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      LEFT JOIN bill_postpaid bp ON bd.bill_document_id = bp.bill_document_id
      WHERE bd.bill_status NOT ILIKE 'CANCELLED'
      ORDER BY bd.bill_document_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const generateBill = async (req, res) => {
  const { connection_id, bill_period_start, bill_period_end, due_date } = req.body;

  if (!connection_id || !bill_period_start || !bill_period_end || !due_date) {
    return res.status(400).json({ error: 'connection_id, bill_period_start, bill_period_end, due_date are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const connCheck = await client.query(
      `SELECT payment_type, tariff_id FROM utility_connection WHERE connection_id = $1`,
      [connection_id]
    );
    if (connCheck.rows.length === 0) return res.status(404).json({ error: 'Connection not found' });
    if (connCheck.rows[0].payment_type.toUpperCase() !== 'POSTPAID') {
      return res.status(400).json({ error: 'Bill generation only applies to postpaid connections' });
    }

    const tariff_id = connCheck.rows[0].tariff_id;

    const dupCheck = await client.query(
      `SELECT bill_document_id FROM bill_postpaid
      WHERE bill_document_id IN (
        SELECT bill_document_id FROM bill_document WHERE connection_id = $1 AND bill_status = 'UNPAID'
      )
      AND bill_period_start <= $3 AND bill_period_end >= $2`,
      [connection_id, bill_period_start, bill_period_end]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'An unpaid bill already exists for this period' });
    }

    const energyResult = await client.query(
      `SELECT calculate_energy_amount($1, $2, $3) AS energy_amount`,
      [connection_id, bill_period_start, bill_period_end]
    );
    const energy_amount = parseFloat(energyResult.rows[0].energy_amount) || 0;

    const usageResult = await client.query(
      `SELECT COALESCE(SUM(u.unit_used), 0) AS total_units
      FROM usage u
      JOIN utility_connection uc ON u.meter_id = uc.meter_id
      WHERE uc.connection_id = $1
        AND u.time_to::date BETWEEN $2 AND $3`,
      [connection_id, bill_period_start, bill_period_end]
    );
    const unit_consumed = parseFloat(usageResult.rows[0].total_units) || 0;

    const fcResult = await client.query(
      `SELECT COALESCE(SUM(charge_amount), 0) AS fixed_total,
             array_agg(fixed_charge_id) AS charge_ids
      FROM fixed_charge
      WHERE tariff_id = $1 AND is_mandatory = TRUE`,
      [tariff_id]
    );
    const fixed_total = parseFloat(fcResult.rows[0].fixed_total) || 0;
    const charge_ids = fcResult.rows[0].charge_ids || [];

    const vatResult = await client.query(
      `SELECT COALESCE(vat_rate, 0) AS vat_rate, COALESCE(is_vat_exempt, false) AS is_vat_exempt
       FROM tariff WHERE tariff_id = $1`,
      [tariff_id]
    );
    const tariff_vat_rate = parseFloat(vatResult.rows[0]?.vat_rate) || 0;
    const is_vat_exempt = vatResult.rows[0]?.is_vat_exempt ?? false;

    const subtotal = energy_amount + fixed_total;
    const vat_amount = is_vat_exempt ? 0 : parseFloat((subtotal * tariff_vat_rate / 100).toFixed(2));
    const total_amount = subtotal + vat_amount;

    const billResult = await client.query(
      `INSERT INTO bill_document (connection_id, bill_type, unit_consumed, energy_amount, subtotal, vat_rate, vat_amount, is_vat_exempt, total_amount, bill_status)
      VALUES ($1, 'POSTPAID', $2, $3, $4, $5, $6, $7, $8, 'UNPAID')
      RETURNING bill_document_id`,
      [connection_id, unit_consumed, energy_amount, subtotal, tariff_vat_rate, vat_amount, is_vat_exempt, total_amount]
    );
    const bill_document_id = billResult.rows[0].bill_document_id;

    await client.query(
      `INSERT INTO bill_postpaid (bill_document_id, bill_period_start, bill_period_end, due_date)
      VALUES ($1, $2, $3, $4)`,
      [bill_document_id, bill_period_start, bill_period_end, due_date]
    );

    const timeframe = `${bill_period_start} to ${bill_period_end}`;
    for (const fc_id of charge_ids) {
      await client.query(
        `INSERT INTO fixed_charge_applied (fixed_charge_id, bill_document_id, timeframe)
        VALUES ($1, $2, $3)`,
        [fc_id, bill_document_id, timeframe]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Bill generated successfully',
      bill_document_id,
      unit_consumed,
      energy_amount,
      fixed_charges: fixed_total,
      subtotal,
      vat_rate: tariff_vat_rate,
      vat_amount,
      is_vat_exempt,
      total_amount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate bill' });
  } finally {
    client.release();
  }
};

const updateBillStatus = async (req, res) => {
  const { id } = req.params;
  const { bill_status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bill_document SET bill_status = $1 WHERE bill_document_id = $2 RETURNING *`,
      [bill_status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getPayments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pm.method_name, bd.total_amount as bill_total, bd.connection_id
      FROM payment p
      LEFT JOIN payment_method pm ON p.method_id = pm.method_id
      LEFT JOIN bill_document bd ON p.bill_document_id = bd.bill_document_id
      ORDER BY p.payment_id DESC
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const getTableData = async (req, res) => {
  const { tableName } = req.params;
  if (!ALLOWED_TABLES[tableName]) return res.status(400).json({ error: 'Invalid table name' });
  try {
    const result = await pool.query(`SELECT * FROM ${tableName}`);
    res.json({ table: tableName, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

const deleteTableRow = async (req, res) => {
  const { tableName, id } = req.params;
  if (!ALLOWED_TABLES[tableName]) return res.status(400).json({ error: 'Invalid table name' });
  const idColumn = ALLOWED_TABLES[tableName];
  try {
    await pool.query(`DELETE FROM ${tableName} WHERE ${idColumn} = $1`, [id]);
    res.json({ message: `Deleted from ${tableName}`, id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', detail: err.message });
  }
};

const getRegionUtilities = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.utility_id, u.utility_name, u.utility_type,
              COALESCE(ur.is_available, TRUE) AS is_available
       FROM utility_region ur
       JOIN utility u ON ur.utility_id = u.utility_id
       WHERE ur.region_id = $1
       ORDER BY u.utility_name`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const updateRegionUtilityAvailability = async (req, res) => {
  const { id, utilityId } = req.params;
  const { is_available } = req.body;
  try {
    const result = await pool.query(
      `UPDATE utility_region
       SET is_available = $1
       WHERE region_id = $2 AND utility_id = $3
       RETURNING *`,
      [is_available, id, utilityId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utility not found in this region' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const updateRegionCapacity = async (req, res) => {
  const { id } = req.params;
  const { max_connections, is_accepting_connections, capacity_note } = req.body;
  try {
    const result = await pool.query(
      `UPDATE region
       SET max_connections           = COALESCE($1, max_connections),
           is_accepting_connections  = COALESCE($2, is_accepting_connections),
           capacity_note             = $3
       WHERE region_id = $4 RETURNING *`,
      [max_connections, is_accepting_connections, capacity_note ?? null, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const [monthlyRes, quarterlyRes, yearlyRes, breakdownRes, lossesRes, topRegionsRes] = await Promise.all([
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', bd.bill_generation_date), 'Mon') AS period,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'electricity' THEN bd.total_amount ELSE 0 END), 0)::float AS electricity,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'water'       THEN bd.total_amount ELSE 0 END), 0)::float AS water,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'gas'         THEN bd.total_amount ELSE 0 END), 0)::float AS gas
        FROM bill_document bd
        JOIN utility_connection uc ON bd.connection_id = uc.connection_id
        JOIN tariff t  ON uc.tariff_id  = t.tariff_id
        JOIN utility u ON t.utility_id  = u.utility_id
        WHERE bd.bill_generation_date >= CURRENT_DATE - INTERVAL '6 months'
          AND bd.bill_status NOT ILIKE 'CANCELLED'
        GROUP BY DATE_TRUNC('month', bd.bill_generation_date)
        ORDER BY DATE_TRUNC('month', bd.bill_generation_date)
      `),
      pool.query(`
        SELECT
          'Q' || EXTRACT(QUARTER FROM bd.bill_generation_date)::text
            || ' ' || TO_CHAR(bd.bill_generation_date, 'YY') AS period,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'electricity' THEN bd.total_amount ELSE 0 END), 0)::float AS electricity,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'water'       THEN bd.total_amount ELSE 0 END), 0)::float AS water,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'gas'         THEN bd.total_amount ELSE 0 END), 0)::float AS gas
        FROM bill_document bd
        JOIN utility_connection uc ON bd.connection_id = uc.connection_id
        JOIN tariff t  ON uc.tariff_id  = t.tariff_id
        JOIN utility u ON t.utility_id  = u.utility_id
        WHERE bd.bill_generation_date >= CURRENT_DATE - INTERVAL '12 months'
          AND bd.bill_status NOT ILIKE 'CANCELLED'
        GROUP BY
          DATE_TRUNC('quarter', bd.bill_generation_date),
          EXTRACT(QUARTER FROM bd.bill_generation_date),
          TO_CHAR(bd.bill_generation_date, 'YY')
        ORDER BY DATE_TRUNC('quarter', bd.bill_generation_date)
      `),
      pool.query(`
        SELECT
          TO_CHAR(bd.bill_generation_date, 'YYYY') AS period,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'electricity' THEN bd.total_amount ELSE 0 END), 0)::float AS electricity,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'water'       THEN bd.total_amount ELSE 0 END), 0)::float AS water,
          COALESCE(SUM(CASE WHEN LOWER(u.utility_type) = 'gas'         THEN bd.total_amount ELSE 0 END), 0)::float AS gas
        FROM bill_document bd
        JOIN utility_connection uc ON bd.connection_id = uc.connection_id
        JOIN tariff t  ON uc.tariff_id  = t.tariff_id
        JOIN utility u ON t.utility_id  = u.utility_id
        WHERE bd.bill_generation_date >= CURRENT_DATE - INTERVAL '3 years'
          AND bd.bill_status NOT ILIKE 'CANCELLED'
        GROUP BY TO_CHAR(bd.bill_generation_date, 'YYYY')
        ORDER BY period
      `),
      pool.query(`
        WITH grand AS (SELECT COALESCE(SUM(total_amount), 1) AS total FROM bill_document WHERE bill_status NOT ILIKE 'CANCELLED')
        SELECT
          CASE
            WHEN LOWER(u.utility_type) = 'electricity' THEN 'Electricity'
            WHEN LOWER(u.utility_type) = 'water'       THEN 'Water'
            WHEN LOWER(u.utility_type) = 'gas'         THEN 'Gas'
            ELSE 'Other'
          END AS name,
          ROUND(100.0 * SUM(bd.total_amount) / (SELECT total FROM grand), 1)::float AS value
        FROM bill_document bd
        JOIN utility_connection uc ON bd.connection_id = uc.connection_id
        JOIN tariff t  ON uc.tariff_id  = t.tariff_id
        JOIN utility u ON t.utility_id  = u.utility_id
        WHERE bd.bill_status NOT ILIKE 'CANCELLED'
        GROUP BY LOWER(u.utility_type)
      `),
      pool.query(`
        WITH cq AS (
          SELECT COALESCE(SUM(CASE WHEN bill_status = 'UNPAID' THEN total_amount END), 0) AS unpaid
          FROM bill_document WHERE bill_generation_date >= CURRENT_DATE - INTERVAL '3 months'
        ),
        pq AS (
          SELECT COALESCE(SUM(CASE WHEN bill_status = 'UNPAID' THEN total_amount END), 0) AS unpaid
          FROM bill_document
          WHERE bill_generation_date >= CURRENT_DATE - INTERVAL '6 months'
            AND bill_generation_date < CURRENT_DATE - INTERVAL '3 months'
        )
        SELECT
          cq.unpaid::float                                        AS unpaid_total,
          CASE
            WHEN pq.unpaid > 0
            THEN ROUND(((cq.unpaid - pq.unpaid) / pq.unpaid) * 100, 1)
            ELSE 0
          END::float                                              AS trend_pct,
          CASE WHEN cq.unpaid >= pq.unpaid THEN 'increasing' ELSE 'decreasing' END AS trend
        FROM cq, pq
      `),
      pool.query(`
        SELECT
          r.region_name AS name,
          ROUND(
            100.0 * COUNT(CASE WHEN bd.bill_status = 'UNPAID' THEN 1 END) /
            NULLIF(COUNT(bd.bill_document_id), 0),
            1
          )::float AS rate
        FROM region r
        LEFT JOIN address  a  ON r.region_id   = a.region_id
        LEFT JOIN meter    m  ON a.address_id  = m.address_id
        LEFT JOIN utility_connection uc ON m.meter_id = uc.meter_id
        LEFT JOIN bill_document bd ON uc.connection_id = bd.connection_id
          AND bd.bill_status NOT ILIKE 'CANCELLED'
        GROUP BY r.region_name
        HAVING COUNT(bd.bill_document_id) > 0
        ORDER BY rate DESC NULLS LAST
        LIMIT 3
      `)
    ]);

    const colors = { Electricity: '#CCFF00', Water: '#00D4FF', Gas: '#FF9900', Other: '#888888' };
    const breakdown = breakdownRes.rows.map(r => ({ ...r, color: colors[r.name] || '#888888' }));
    const losses = lossesRes.rows[0] || { unpaid_total: 0, trend_pct: 0, trend: 'stable' };

    res.json({
      monthly:    monthlyRes.rows,
      quarterly:  quarterlyRes.rows,
      yearly:     yearlyRes.rows,
      breakdown,
      losses: { ...losses, top_regions: topRegionsRes.rows },
    });
  } catch (err) {
    console.error('Revenue analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
};

const getWorkerAnalytics = async (req, res) => {
  try {
    const [workersRes, trendsRes] = await Promise.all([
      pool.query(`
        SELECT
          fw.person_id                                          AS id,
          p.first_name || ' ' || p.last_name                   AS name,
          COALESCE(r.region_name, 'Unassigned')                AS region,
          COUNT(CASE WHEN c.status = 'Resolved' THEN 1 END)    AS complaints,
          ROUND(
            AVG(CASE
              WHEN c.status = 'Resolved'
               AND c.assignment_date IS NOT NULL
               AND c.resolution_date IS NOT NULL
              THEN EXTRACT(EPOCH FROM (c.resolution_date::timestamp - c.assignment_date::timestamp)) / 3600
            END), 1
          )::float                                              AS avg_hours,
          COUNT(DISTINCT mr.reading_id)                        AS readings
        FROM field_worker fw
        JOIN person p ON fw.person_id = p.person_id
        LEFT JOIN region r ON fw.assigned_region_id = r.region_id
        LEFT JOIN complaint c ON fw.person_id = c.assigned_to
        LEFT JOIN meter_reading mr ON fw.person_id = mr.field_worker_id
        GROUP BY fw.person_id, p.first_name, p.last_name, r.region_name
        ORDER BY complaints DESC
      `),
      pool.query(`
        SELECT
          fw.person_id                                          AS id,
          TO_CHAR(DATE_TRUNC('month', c.resolution_date), 'Mon') AS m,
          COUNT(*)::int                                         AS v
        FROM field_worker fw
        JOIN complaint c ON fw.person_id = c.assigned_to
        WHERE c.status = 'Resolved'
          AND c.resolution_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY fw.person_id, DATE_TRUNC('month', c.resolution_date)
        ORDER BY fw.person_id, DATE_TRUNC('month', c.resolution_date)
      `)
    ]);

    // Build perfHistory map keyed by worker id
    const perfHistory = {};
    for (const row of trendsRes.rows) {
      if (!perfHistory[row.id]) perfHistory[row.id] = [];
      perfHistory[row.id].push({ m: row.m, v: row.v });
    }

    res.json({ workers: workersRes.rows, perfHistory });
  } catch (err) {
    console.error('Worker analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch worker analytics' });
  }
};

const getRegionalAnalytics = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.region_id                                                                AS id,
        r.region_name                                                              AS name,
        r.postal_code,
        COALESCE(r.max_connections, 1000)                                          AS max_connections,
        COALESCE(r.is_accepting_connections, TRUE)                                 AS is_accepting_connections,
        COALESCE(r.capacity_note, '')                                              AS capacity_note,
        COUNT(CASE WHEN uc.connection_status IN ('Active','Pending') THEN uc.connection_id END) AS current_connections,
        COUNT(CASE WHEN LOWER(u.utility_type) = 'electricity' AND uc.connection_status = 'Active' THEN uc.connection_id END) AS electricity,
        COUNT(CASE WHEN LOWER(u.utility_type) = 'water'       AND uc.connection_status = 'Active' THEN uc.connection_id END) AS water,
        COUNT(CASE WHEN LOWER(u.utility_type) = 'gas'         AND uc.connection_status = 'Active' THEN uc.connection_id END) AS gas,
        COUNT(CASE WHEN uc.connection_status = 'Pending' THEN uc.connection_id END)                                           AS pending,
        COUNT(CASE WHEN c.status NOT ILIKE 'Resolved' AND c.status IS NOT NULL THEN c.complaint_id END)                       AS complaints
      FROM region r
      LEFT JOIN address  a  ON r.region_id   = a.region_id
      LEFT JOIN meter    m  ON a.address_id  = m.address_id
      LEFT JOIN utility_connection uc ON m.meter_id = uc.meter_id
      LEFT JOIN tariff   t  ON uc.tariff_id  = t.tariff_id
      LEFT JOIN utility  u  ON t.utility_id  = u.utility_id
      LEFT JOIN complaint c ON uc.connection_id = c.connection_id
      GROUP BY r.region_id, r.region_name, r.postal_code,
               r.max_connections, r.is_accepting_connections, r.capacity_note
      ORDER BY r.region_name
    `);

    const regions = result.rows.map(r => {
      const pct = r.max_connections > 0
        ? Math.round((r.current_connections / r.max_connections) * 100)
        : 0;
      let status = 'Available';
      if (!r.is_accepting_connections) status = 'Closed';
      else if (pct >= 90) status = 'Overloaded';
      else if (pct >= 70) status = 'Limited';
      return { ...r, capacity_pct: pct, status };
    });

    res.json({ regions });
  } catch (err) {
    console.error('Regional analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch regional analytics' });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.person_id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.national_id,
        p.date_of_birth,
        p.gender,
        acc.email,
        acc.account_type  AS role,
        acc.created_at,
        acc.avatar_url,
        addr.house_num,
        addr.street_name,
        addr.landmark,
        r.region_name,
        r.postal_code,
        e.role            AS job_role,
        e.employee_num,
        e.hire_date,
        e.employment_status,
        (SELECT COUNT(*) FROM connection_application WHERE reviewed_by = p.person_id)             AS applications_reviewed,
        (SELECT COUNT(*) FROM complaint        WHERE assigned_by = p.person_id)                   AS complaints_assigned,
        (SELECT COUNT(*) FROM bill_document bd
          JOIN utility_connection uc ON bd.connection_id = uc.connection_id
          WHERE uc.consumer_id IS NOT NULL)                                                        AS total_bills_in_system
      FROM person p
      JOIN account  acc  ON acc.person_id     = p.person_id
      JOIN employee e    ON e.person_id       = p.person_id
      JOIN address  addr ON p.address_id      = addr.address_id
      JOIN region   r    ON addr.region_id    = r.region_id
      WHERE p.person_id = $1 AND acc.account_type ILIKE 'EMPLOYEE'`,
      [req.user.person_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const getReadings = async (req, res) => {
  const { status = 'pending', utility_type, date_from, date_to } = req.query;

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status === 'pending') {
      conditions.push('mr.approved_by IS NULL');
    } else if (status === 'approved') {
      conditions.push('mr.approved_by IS NOT NULL');
    }

    if (utility_type) {
      conditions.push(`u.utility_name = $${idx++}`);
      params.push(utility_type);
    }
    if (date_from) {
      conditions.push(`mr.reading_date >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`mr.reading_date <= $${idx++}`);
      params.push(date_to + ' 23:59:59');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        mr.reading_id,
        mr.meter_id,
        mr.units_logged,
        mr.time_from,
        mr.time_to,
        mr.reading_date,
        mr.approved_by,
        cp.first_name || ' ' || cp.last_name AS consumer_name,
        cp.phone_number AS consumer_phone,
        fwp.first_name || ' ' || fwp.last_name AS field_worker_name,
        fwp.phone_number AS field_worker_phone,
        r.region_name AS field_worker_region,
        u.utility_name AS utility_type,
        u.unit_of_measurement
      FROM meter_reading mr
      JOIN meter m ON mr.meter_id = m.meter_id
      JOIN utility_connection uc ON uc.meter_id = m.meter_id AND uc.connection_status ILIKE 'Active'
      JOIN consumer c ON uc.consumer_id = c.person_id
      JOIN person cp ON c.person_id = cp.person_id
      JOIN field_worker fw ON mr.field_worker_id = fw.person_id
      JOIN person fwp ON fw.person_id = fwp.person_id
      JOIN region r ON fw.assigned_region_id = r.region_id
      JOIN tariff t ON mr.tariff_id = t.tariff_id
      JOIN utility u ON t.utility_id = u.utility_id
      ${where}
      ORDER BY mr.reading_date DESC
    `, params);

    res.json({ data: { readings: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getReadingById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        mr.reading_id,
        mr.meter_id,
        mr.units_logged,
        mr.time_from,
        mr.time_to,
        mr.reading_date,
        mr.approved_by,
        cp.first_name || ' ' || cp.last_name AS consumer_name,
        cp.phone_number AS consumer_phone,
        c.person_id AS consumer_id,
        fwp.first_name || ' ' || fwp.last_name AS field_worker_name,
        fwp.phone_number AS field_worker_phone,
        r.region_name AS field_worker_region,
        u.utility_name AS utility_type,
        u.unit_of_measurement,
        m.meter_type
      FROM meter_reading mr
      JOIN meter m ON mr.meter_id = m.meter_id
      JOIN utility_connection uc ON uc.meter_id = m.meter_id AND uc.connection_status ILIKE 'Active'
      JOIN consumer c ON uc.consumer_id = c.person_id
      JOIN person cp ON c.person_id = cp.person_id
      JOIN field_worker fw ON mr.field_worker_id = fw.person_id
      JOIN person fwp ON fw.person_id = fwp.person_id
      JOIN region r ON fw.assigned_region_id = r.region_id
      JOIN tariff t ON mr.tariff_id = t.tariff_id
      JOIN utility u ON t.utility_id = u.utility_id
      WHERE mr.reading_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    const reading = result.rows[0];

    const prevResult = await pool.query(`
      SELECT units_logged
      FROM meter_reading
      WHERE meter_id = $1 AND approved_by IS NOT NULL AND reading_id != $2
      ORDER BY reading_date DESC LIMIT 1
    `, [reading.meter_id, id]);

    if (prevResult.rows.length > 0) {
      reading.previous_reading_units = prevResult.rows[0].units_logged;
    }

    res.json({ data: reading });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const approveReading = async (req, res) => {
  const { id } = req.params;
  const employee_id = req.user.person_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const check = await client.query(
      'SELECT reading_id, approved_by FROM meter_reading WHERE reading_id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reading not found' });
    }

    if (check.rows[0].approved_by) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reading already approved' });
    }

    await client.query(
      'UPDATE meter_reading SET approved_by = $1 WHERE reading_id = $2',
      [employee_id, id]
    );

    await client.query('SELECT create_usage_from_reading($1, $2)', [id, employee_id]);

    await client.query('COMMIT');
    res.json({ message: 'Reading approved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to approve reading' });
  } finally {
    client.release();
  }
};

module.exports = {
  getTables,
  createRegion,
  updateRegion,
  deleteRegion,
  getAddresses,
  getPersons,
  getUtilities,
  getConsumers,
  updateConsumer,
  getEmployees,
  getFieldWorkers,
  getTariffs,
  createTariff,
  updateTariff,
  deactivateTariff,
  getTariffSlabs,
  createTariffSlab,
  updateTariffSlab,
  deleteTariffSlab,
  getTariffFixedCharges,
  createTariffFixedCharge,
  deleteTariffFixedCharge,
  getMeters,
  createMeter,
  getConnections,
  createConnection,
  updateConnectionStatus,
  getApplications,
  updateApplicationStatus,
  getComplaints,
  assignComplaint,
  assignComplaintAuto,
  updateComplaintStatus,
  approveComplaintChange,
  getBills,
  generateBill,
  updateBillStatus,
  getPayments,
  getTableData,
  deleteTableRow,
  getProfile,
  getReadings,
  getReadingById,
  approveReading,
  updateRegionCapacity,
  getRegionUtilities,
  updateRegionUtilityAvailability,
  getRevenueAnalytics,
  getWorkerAnalytics,
  getRegionalAnalytics,
};