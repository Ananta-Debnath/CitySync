const express = require("express");
const router = express.Router();
const { testDb, getRegions, getBankNames, getProviders, getUtilityNames } = require("../controllers/publicController");

router.get("/test-db", testDb);
router.get("/regions", getRegions);
// router.get("/address", getAllAddresses);
router.get("/banks", getBankNames);
router.get("/utility-names/:reg_id", getUtilityNames);
router.get("/mobile-banking-providers", getProviders);

module.exports = router;