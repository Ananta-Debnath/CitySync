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

module.exports = {
  testDb,
  getRegions,
  getAllAddresses,
  getBankNames,
  getProviders
};