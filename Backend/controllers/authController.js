const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const pool = require("../db");

const login = async (req, res) => {
  const { identifier, password } = req.body;
  console.log("Login attempt", { identifier });

  try {
    const result = await pool.query(
      "SELECT * FROM ACCOUNT WHERE EMAIL=$1",
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

module.exports = { login };
