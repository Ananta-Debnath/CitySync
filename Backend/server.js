const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/public", require("./routes/public"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/consumer", require("./routes/consumer"));
app.use('/api/ai', require("./routes/ai"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
