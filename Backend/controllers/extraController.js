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
    const result = await pool.query("SELECT * FROM REGION");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

const getAddresses = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ADDRESS");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Database error");
  }
};

module.exports = {
  testDb,
  getRegions,
  getAddresses,
};