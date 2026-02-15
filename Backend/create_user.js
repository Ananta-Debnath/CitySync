const bcrypt = require("bcrypt");
const pool = require("./db"); // your existing db.js

const createUser = async () => {
  try {
    const email = "john.doe@example.com";
    const password = "employee"; // plaintext
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    const result = await pool.query(
      `INSERT INTO ACCOUNT (person_id, account_type, email, password_hashed, is_active, created_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())`,
      [1, "employee", email, hashedPassword]
    );

    console.log("User created with hashed password");
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

createUser();
