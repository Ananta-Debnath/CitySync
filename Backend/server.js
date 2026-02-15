const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


app.use("/auth", require("./routes/auth"));
app.use("/extra", require("./routes/extra"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
