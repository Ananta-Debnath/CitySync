const express = require("express");
const router = express.Router();
const { testDb, getRegions, getAddresses } = require("../controllers/extraController");

router.get("/test-db", testDb);
router.get("/regions", getRegions);
router.get("/address", getAddresses);

module.exports = router;