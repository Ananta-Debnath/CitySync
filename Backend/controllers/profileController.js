const pool = require("../db");



const getPerson = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        a.house_num,
        a.street_name,
        a.landmark,
        a.region_id,
        r.region_name,
        r.postal_code
      FROM person p
      JOIN address a ON p.address_id = a.address_id
      JOIN region r ON a.region_id = r.region_id
      WHERE person_id = $1
    `, [req.user.person_id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch person details' });
  }
}


module.exports = {
  getPerson,
};