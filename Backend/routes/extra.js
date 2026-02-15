const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { testDb, getRegions, getAllAddresses, getAddress } = require("../controllers/extraController");

router.get("/test-db", testDb);
router.get("/regions", getRegions);
router.get("/address", getAllAddresses);
router.get("/person/address", authMiddleware, getAddress);

module.exports = router;