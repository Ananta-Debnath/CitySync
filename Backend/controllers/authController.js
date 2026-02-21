const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const pool = require("../db");

const login = async (req, res) => {
  const { identifier, password } = req.body;
  console.log("Login attempt", { identifier });

  try {
    const result = await pool.query(
      "SELECT * FROM ACCOUNT WHERE EMAIL ILIKE $1",
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid identifier or password" });
    }

    // multiple rows may exist for the same email; find the row whose
    // `password_hashed` matches the provided password and return its account_type
    const rows = result.rows;
    let matchedUser = null;
    for (const u of rows) {
      const hashed = u.password_hashed;
      if (!hashed) {
        console.error("Password hash missing for account", { account: u });
        continue;
      }
      try {
        const match = await bcrypt.compare(password, hashed);
        if (match) {
          // console.log("Password match for account", { account: u });
          matchedUser = u;
          break;
        }
      } catch (e) {
        console.error("bcrypt compare error", e);
        continue;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: "Invalid identifier or password" });
    }

    // 3️⃣ Generate JWT
    const token = jwt.sign(
      {
        person_id: matchedUser.person_id,
        role: matchedUser.account_type
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      // success: true,
      token,
      // role: matchedUser.account_type,
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

const register = async (req, res) => {
  const {
    firstName,
    lastName,
    nationalId,
    phoneNumber,
    email,
    password,
    houseNum,
    streetName,
    regionName,
    postalCode,
    dateOfBirth,
    gender,
    landmark,
    consumerType, // 'Residential' or 'Commercial'
  } = req.body;

  // Basic validation
  if (!firstName || !lastName || !nationalId || !phoneNumber || !email || !password || !houseNum || 
      !streetName || !regionName || !postalCode || !dateOfBirth || !gender || !consumerType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  email = email.toLowerCase().trim();

  // Check if region exists, create if not
  // Find regions that match the postal code and verify the provided region name
  let regionResult = await pool.query(
    'SELECT region_id, region_name FROM region WHERE postal_code = $1',
    [postalCode]
  );

  if (!regionResult.rows || regionResult.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid postal code' });
  }

  // Check if the provided regionName matches one of the regions for this postal code
  const matchedRegion = regionResult.rows.find(r => (r.region_name || '').toLowerCase() === (regionName || '').toLowerCase());
  if (!matchedRegion) {
    return res.status(400).json({ error: 'Region name does not match the postal code' });
  }
  const regionId = matchedRegion.region_id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert address
    const addressResult = await client.query(
      'INSERT INTO address (region_id, house_num, street_name, landmark) VALUES ($1, $2, $3, $4) RETURNING address_id',
      [regionId, houseNum, streetName, landmark]
    );
    const addressId = addressResult.rows[0].address_id;

    // Insert person
    const personResult = await client.query(
      'INSERT INTO person (first_name, last_name, national_id, phone_number, date_of_birth, gender, address_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING person_id',
      [firstName, lastName, nationalId, phoneNumber, dateOfBirth, gender, addressId]
    );
    const personId = personResult.rows[0].person_id;

    // Insert consumer
    await client.query(
      'INSERT INTO consumer (person_id, consumer_type) VALUES ($1, $2)',
      [personId, consumerType]
    );

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert account
    await client.query(
      'INSERT INTO account (person_id, account_type, email, password_hashed) VALUES ($1, $2, $3, $4)',
      [personId, 'consumer', email, hashedPassword]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Account created successfully' });
  }
  catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);

    if (err.code === '23505') {
      if (err.detail?.includes('email')) return res.status(400).json({ error: 'Email already registered' });
      if (err.detail?.includes('national_id')) return res.status(400).json({ error: 'National ID already registered' });
      if (err.detail?.includes('phone_number')) return res.status(400).json({ error: 'Phone number already registered' });
      return res.status(400).json({ error: 'Duplicate entry detected' });
    }

    res.status(500).json({ error: err.message || 'Registration failed' });
  }
  finally {
    client.release();
  }
}

// // Create account route
// app.post("/register", async (req, res) => {
// const { person_id, identifier, password, accountType} = req.body;

// if (!person_id || !identifier || !password || !accountType) {
//     return res.status(400).json({ error: "Missing person_id, identifier, password, or account type" });
// }

// try {
//     const hashed = await bcrypt.hash(password, 10);
//     const result = await pool.query(
//     "INSERT INTO ACCOUNT (person_id, account_type, email, password_hashed, is_active, created_at) VALUES ($1, $2, $3, $4, TRUE, NOW()) RETURNING account_id, email, account_type",
//     [person_id, accountType, identifier, hashed]
//     );

//     const created = result.rows[0];
//     res.status(201).json({ accountId: created.account_id, identifier: created.email, accountType: created.account_type });
// } catch (err) {
//     console.error("Error creating account", err.message);
//     res.status(500).json({ error: "Database error" });
// }
// });

module.exports = { login, register };
