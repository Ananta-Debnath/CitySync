const bcrypt = require('bcrypt');
const pool = require('../db');

const getJobs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        comp.*,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        p.phone_number as consumer_phone,
        a.house_num,
        a.street_name,
        a.landmark,
        r.region_name,
        u.utility_name
      FROM complaint comp
      LEFT JOIN consumer c ON comp.consumer_id = c.person_id
      LEFT JOIN person p ON c.person_id = p.person_id
      LEFT JOIN address a ON p.address_id = a.address_id
      LEFT JOIN region r ON a.region_id = r.region_id
      LEFT JOIN utility_connection uc ON comp.connection_id = uc.connection_id
      LEFT JOIN tariff t ON uc.tariff_id = t.tariff_id
      LEFT JOIN utility u ON t.utility_id = u.utility_id
      WHERE comp.assigned_to = $1
      ORDER BY
        CASE comp.priority WHEN 'Urgent' THEN 1 WHEN 'Normal' THEN 2 ELSE 3 END,
        comp.complaint_date DESC`,
      [req.user.person_id]
    );

    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const updateJobStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    if (!['In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "In Progress" or "Resolved"' });
    }

    const result = await pool.query(
      `UPDATE complaint
      SET
        status = $1,
        remarks = COALESCE($2, remarks),
        assignment_date = CASE WHEN $1 = 'In Progress' THEN CURRENT_TIMESTAMP ELSE assignment_date END,
        resolution_date = CASE WHEN $1 = 'Resolved' THEN CURRENT_TIMESTAMP ELSE resolution_date END
      WHERE complaint_id = $3 AND assigned_to = $4
      RETURNING *`,
      [status, remarks || null, id, req.user.person_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found or not assigned to you' });
    }

    const updatedComplaint = result.rows[0];

    // Send notification to consumer
    const { sendNotification } = require('../socket');
    const msg = `Complaint #${updatedComplaint.complaint_id} status updated to ${updatedComplaint.status}`;
    const dotColor = updatedComplaint.status === 'Resolved' ? 'bg-lime' : 'bg-orange';
    sendNotification(updatedComplaint.consumer_id, msg, dotColor);

    res.json({ message: 'Job status updated', data: updatedComplaint });

    res.json({ message: 'Job status updated', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getConnections = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        uc.connection_id,
        uc.connection_status,
        uc.tariff_id,
        m.meter_id,
        m.meter_type,
        a.house_num,
        a.street_name,
        p.first_name as consumer_first_name,
        p.last_name as consumer_last_name,
        u.utility_name,
        u.unit_of_measurement
      FROM utility_connection uc
      JOIN meter m ON uc.meter_id = m.meter_id
      JOIN address a ON m.address_id = a.address_id
      JOIN consumer c ON uc.consumer_id = c.person_id
      JOIN person p ON c.person_id = p.person_id
      JOIN tariff t ON uc.tariff_id = t.tariff_id
      JOIN utility u ON t.utility_id = u.utility_id
      JOIN field_worker fw ON fw.assigned_region_id = a.region_id
      WHERE fw.person_id = $1
        AND uc.connection_status ILIKE 'Active'
      ORDER BY a.street_name, a.house_num`,
      [req.user.person_id]
    );

    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getMeters = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        m.meter_id,
        m.meter_type,
        m.is_active,
        a.house_num,
        a.street_name,
        a.landmark,
        t.tariff_id,
        t.tariff_name,
        t.consumer_category,
        t.billing_method,
        EXISTS (
          SELECT 1 FROM utility_connection uc2
          WHERE uc2.meter_id = m.meter_id AND uc2.connection_status ILIKE 'Active'
        ) AS has_active_connection
      FROM meter m
      JOIN address a ON m.address_id = a.address_id
      JOIN field_worker fw ON fw.assigned_region_id = a.region_id
      LEFT JOIN utility_connection uc ON uc.meter_id = m.meter_id AND uc.connection_status ILIKE 'Active'
      LEFT JOIN tariff t ON t.tariff_id = uc.tariff_id
      WHERE fw.person_id = $1`,
      [req.user.person_id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getMeterStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*)                                    AS total_meters,
        COUNT(*) FILTER (WHERE m.is_active = TRUE)  AS active_meters,
        COUNT(*) FILTER (WHERE m.is_active = FALSE) AS inactive_meters
      FROM meter m
      JOIN address a ON m.address_id = a.address_id
      JOIN field_worker fw ON fw.assigned_region_id = a.region_id
      WHERE fw.person_id = $1`,
      [req.user.person_id]
    );
    const row = result.rows[0];
    res.json({
      total_meters:    parseInt(row.total_meters)   || 0,
      active_meters:   parseInt(row.active_meters)  || 0,
      inactive_meters: parseInt(row.inactive_meters)|| 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const createMeter = async (req, res) => {
  const { meter_type, house_num, street_name, landmark } = req.body;

  if (!meter_type || !house_num || !street_name) {
    return res.status(400).json({ error: 'meter_type, house_num, and street_name are required' });
  }
  if (!['Electricity', 'Water', 'Gas'].includes(meter_type)) {
    return res.status(400).json({ error: 'meter_type must be Electricity, Water, or Gas' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const regionRes = await client.query(
      `SELECT assigned_region_id FROM field_worker WHERE person_id = $1`,
      [req.user.person_id]
    );
    if (regionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Field worker has no assigned region' });
    }
    const { assigned_region_id } = regionRes.rows[0];

    const addrRes = await client.query(
      `INSERT INTO address (region_id, house_num, street_name, landmark)
       VALUES ($1, $2, $3, $4)
       RETURNING address_id`,
      [assigned_region_id, house_num, street_name, landmark || null]
    );
    const address_id = addrRes.rows[0].address_id;

    const meterRes = await client.query(
      `INSERT INTO meter (address_id, meter_type, is_active)
       VALUES ($1, $2, FALSE)
       RETURNING meter_id, meter_type, is_active, address_id`,
      [address_id, meter_type]
    );
    const meter = meterRes.rows[0];

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Meter registered successfully',
      data: { ...meter, house_num, street_name, landmark: landmark || null },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to register meter' });
  } finally {
    client.release();
  }
};

const getTariffs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tariff_id, tariff_name, consumer_category, billing_method
       FROM tariff
       WHERE is_active = TRUE`
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getTariffSlabs = async (req, res) => {
  const { tariff_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT slab_num, charge_type, unit_from, unit_to, rate_per_unit
       FROM tariff_slab
       WHERE tariff_id = $1
       ORDER BY slab_num`,
      [tariff_id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const getReadings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        mr.reading_id,
        mr.meter_id,
        m.meter_type,
        mr.tariff_id,
        mr.slab_num,
        mr.time_from,
        mr.time_to,
        mr.units_logged,
        mr.reading_date,
        mr.approved_by
      FROM meter_reading mr
      JOIN meter m ON mr.meter_id = m.meter_id
      WHERE mr.field_worker_id = $1
      ORDER BY mr.reading_date DESC`,
      [req.user.person_id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};

const submitReading = async (req, res) => {
  const { meter_id, tariff_id, slab_num, time_from, time_to, units_logged } = req.body;

  if (!meter_id || !tariff_id || !slab_num || !time_from || !time_to || units_logged === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: meter_id, tariff_id, slab_num, time_from, time_to, units_logged'
    });
  }

  if (new Date(time_to) <= new Date(time_from)) {
    return res.status(400).json({ error: 'time_to must be after time_from' });
  }

  if (parseFloat(units_logged) <= 0) {
    return res.status(400).json({ error: 'units_logged must be greater than 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const readingResult = await client.query(
      `INSERT INTO meter_reading (meter_id, tariff_id, slab_num, field_worker_id, time_from, time_to, units_logged, reading_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING reading_id`,
      [meter_id, tariff_id, slab_num, req.user.person_id, time_from, time_to, units_logged]
    );

    const readingId = readingResult.rows[0].reading_id;

    await client.query('COMMIT');
    res.status(201).json({ message: 'Reading submitted, pending employee approval', reading_id: readingId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to submit reading' });
  } finally {
    client.release();
  }
};

const getDashboard = async (req, res) => {
  const personId = req.user.person_id;
  try {
    const [workerRes, complaintStatsRes, readingStatsRes, urgentComplaintsRes, recentReadingsRes] = await Promise.all([
      pool.query(
        `SELECT
          p.first_name,
          p.last_name,
          fw.expertise,
          fw.skillset,
          r.region_name,
          r.postal_code
        FROM person p
        JOIN field_worker fw ON fw.person_id = p.person_id
        LEFT JOIN region r ON fw.assigned_region_id = r.region_id
        WHERE p.person_id = $1`,
        [personId]
      ),
      pool.query(
        `SELECT
          COUNT(*)                                           AS complaints_assigned,
          COUNT(*) FILTER (WHERE status = 'Resolved')       AS complaints_resolved,
          COUNT(*) FILTER (WHERE status = 'In Progress')    AS complaints_in_progress
        FROM complaint
        WHERE assigned_to = $1`,
        [personId]
      ),
      pool.query(
        `SELECT
          (SELECT COUNT(*) FROM meter_reading WHERE field_worker_id = $1)                         AS readings_submitted,
          (SELECT COUNT(*) FROM meter_reading WHERE field_worker_id = $1 AND approved_by IS NULL) AS readings_pending_approval`,
        [personId]
      ),
      pool.query(
        `SELECT complaint_id, description, status, priority, complaint_date
        FROM complaint
        WHERE assigned_to = $1 AND status != 'Resolved'
        ORDER BY complaint_date DESC
        LIMIT 5`,
        [personId]
      ),
      pool.query(
        `SELECT reading_id, meter_id, units_logged, reading_date, approved_by
        FROM meter_reading
        WHERE field_worker_id = $1
        ORDER BY reading_date DESC
        LIMIT 5`,
        [personId]
      ),
    ]);

    const worker = workerRes.rows[0] || {};
    const s = { ...complaintStatsRes.rows[0], ...readingStatsRes.rows[0] };
    const complaintsAssigned = parseInt(s.complaints_assigned) || 0;
    const complaintsResolved = parseInt(s.complaints_resolved) || 0;

    res.json({
      data: {
        worker,
        stats: {
          readings_submitted:         parseInt(s.readings_submitted) || 0,
          readings_pending_approval:  parseInt(s.readings_pending_approval) || 0,
          complaints_assigned:        complaintsAssigned,
          complaints_resolved:        complaintsResolved,
          complaints_in_progress:     parseInt(s.complaints_in_progress) || 0,
          resolution_rate:            complaintsAssigned > 0
                                        ? Math.round((complaintsResolved / complaintsAssigned) * 100)
                                        : 0,
        },
        urgent_complaints: urgentComplaintsRes.rows,
        recent_readings:   recentReadingsRes.rows,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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
        addr.house_num,
        addr.street_name,
        addr.landmark,
        r.region_name,
        r.postal_code,
        e.role            AS job_role,
        e.employee_num,
        e.hire_date,
        e.employment_status,
        fw.expertise,
        fw.skillset,
        ar.region_name    AS assigned_region,
        (SELECT COUNT(*) FROM complaint WHERE assigned_to = p.person_id)                          AS total_jobs,
        (SELECT COUNT(*) FROM complaint WHERE assigned_to = p.person_id AND status = 'Resolved')  AS resolved_jobs,
        (SELECT COUNT(*) FROM complaint WHERE assigned_to = p.person_id AND status != 'Resolved') AS pending_jobs,
        (SELECT COUNT(*) FROM meter_reading WHERE field_worker_id = p.person_id)                  AS total_readings
      FROM person p
      JOIN account     acc  ON acc.person_id       = p.person_id
      LEFT JOIN employee    e    ON e.person_id     = p.person_id
      LEFT JOIN field_worker fw  ON fw.person_id    = p.person_id
      JOIN address     addr ON p.address_id         = addr.address_id
      JOIN region      r    ON addr.region_id       = r.region_id
      LEFT JOIN region ar   ON fw.assigned_region_id = ar.region_id
      WHERE p.person_id = $1 AND acc.account_type ILIKE 'FIELD_WORKER'`,
      [req.user.person_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

module.exports = {
  getDashboard,
  getJobs,
  updateJobStatus,
  getConnections,
  getMeters,
  getMeterStats,
  createMeter,
  getTariffs,
  getTariffSlabs,
  getReadings,
  submitReading,
  getProfile,
};
