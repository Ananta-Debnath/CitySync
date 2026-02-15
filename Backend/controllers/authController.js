const bcrypt = require("bcrypt");
const pool = require("../db");

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM ACCOUNT WHERE EMAIL=$1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
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
          matchedUser = u;
          break;
        }
      } catch (e) {
        console.error("bcrypt compare error", e);
        continue;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({
      username: matchedUser.email,
      accountId: matchedUser.account_id,
      accountType: matchedUser.account_type,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
};

// // Create account route
// app.post("/register", async (req, res) => {
// const { person_id, username, password, accountType} = req.body;

// if (!person_id || !username || !password || !accountType) {
//     return res.status(400).json({ error: "Missing person_id, username, password, or account type" });
// }

// try {
//     const hashed = await bcrypt.hash(password, 10);
//     const result = await pool.query(
//     "INSERT INTO ACCOUNT (person_id, account_type, email, password_hashed, is_active, created_at) VALUES ($1, $2, $3, $4, TRUE, NOW()) RETURNING account_id, email, account_type",
//     [person_id, accountType, username, hashed]
//     );

//     const created = result.rows[0];
//     res.status(201).json({ accountId: created.account_id, username: created.email, accountType: created.account_type });
// } catch (err) {
//     console.error("Error creating account", err.message);
//     res.status(500).json({ error: "Database error" });
// }
// });

module.exports = { login };
