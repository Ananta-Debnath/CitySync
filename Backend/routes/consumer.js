const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getPerson, getConnections, getBills, getBillsById, getUsageHistory, makePayment, getComplaints, submitComplaint } = require("../controllers/consumerController");

router.use(authMiddleware);
router.use(roleMiddleware(['consumer']));

router.get("/me", getPerson);
router.get("/connections", getConnections);
router.get("/bills", getBills);
router.get("/bills/:id", getBillsById);
router.get("/usage", getUsageHistory);
router.post("/pay", makePayment);
router.get("/complaints", getComplaints);
router.post("/complaints", submitComplaint);

module.exports = router;
