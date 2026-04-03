const pool = require("../db");

const testDb = async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  }
  catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getRegions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.*,
        COUNT(CASE WHEN uc.connection_status IN ('Active','Pending') THEN uc.connection_id END) AS current_connections
      FROM region r
      LEFT JOIN address  a  ON r.region_id   = a.region_id
      LEFT JOIN meter    m  ON a.address_id  = m.address_id
      LEFT JOIN utility_connection uc ON m.meter_id = uc.meter_id
      GROUP BY r.region_id
      ORDER BY r.region_name
    `);
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getRegionAvailability = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.region_id,
        r.region_name,
        COALESCE(r.max_connections, 1000)         AS max_connections,
        COALESCE(r.is_accepting_connections, TRUE) AS is_accepting_connections,
        COALESCE(r.capacity_note, '')              AS capacity_note,
        COUNT(CASE WHEN uc.connection_status IN ('Active','Pending') THEN uc.connection_id END) AS current_connections
      FROM region r
      LEFT JOIN address  a  ON r.region_id   = a.region_id
      LEFT JOIN meter    m  ON a.address_id  = m.address_id
      LEFT JOIN utility_connection uc ON m.meter_id = uc.meter_id
      WHERE r.region_id = $1
      GROUP BY r.region_id
    `, [req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' });

    const r = result.rows[0];
    const pct = r.max_connections > 0
      ? Math.round((r.current_connections / r.max_connections) * 100)
      : 0;
    const isOverloaded = pct >= 90;
    const isClosed = !r.is_accepting_connections;

    res.json({
      ...r,
      capacity_pct: pct,
      is_overloaded: isOverloaded,
      warning: isClosed
        ? (r.capacity_note || 'This region is not accepting new connections.')
        : isOverloaded
          ? 'This region is currently overloaded. Your connection may not get approved.'
          : null,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getAllAddresses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ADDRESS");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getBankNames = async (req, res) => {
  try {
    const result = await pool.query("SELECT bank_name FROM bank_name");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getProviders = async (req, res) => {
  try {
    const result = await pool.query("SELECT provider_name FROM mobile_banking_provider");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getUtilityNames = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.utility_id,
        u.utility_name, 
        u.utility_type
      FROM utility u
      JOIN utility_region ur ON u.utility_id = ur.utility_id
      WHERE ur.region_id = $1
    `, [req.params.reg_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};


module.exports = {
  testDb,
  getRegions,
  getAllAddresses,
  getBankNames,
  getProviders,
  getUtilityNames,
  getRegionAvailability,
};