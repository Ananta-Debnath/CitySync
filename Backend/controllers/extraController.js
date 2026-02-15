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

const getAddress = async (req, res) => {
  if (req.user.role !== 'consumer') {
    console.log('Unauthorized access attempt by account_id', req.user.account_id);
    return res.status(403).json({ message: 'Access denied' });
  }
  const accountId = req.user.account_id;
  // console.log('Fetching address for account_id', accountId);
  try {
    const account = await pool.query("SELECT * FROM ACCOUNT WHERE account_id=$1", [accountId]);
    if (account.rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    // console.log('Account found', { account: account.rows[0] });
    const user = await pool.query("SELECT * FROM PERSON WHERE person_id=$1", [account.rows[0].person_id]);
    // console.log('Person found', { person: user.rows[0] });
    const result = await pool.query("SELECT * FROM ADDRESS WHERE address_id=$1", [user.rows[0].address_id]);
    // console.log('Address found', { address: result.rows[0] });
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
  getAddress,
};