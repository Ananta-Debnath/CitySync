const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { getPerson, getConnections, getConnectionDetails, getBills, getBillsById, getUsageHistory, 
        makePayment, getComplaints, submitComplaint, getApplications, submitApplication,
        getProfile, updateProfile, updateAvatar, changePassword, deactivateAccount,
        getPaymentMethods, addPaymentMethod, setDefaultPaymentMethod, deletePaymentMethod,
        getPaymentHistory, createBillForRecharge } = require('../controllers/consumerController');

router.use(authMiddleware);
router.use(roleMiddleware(['consumer']));

router.get("/me", getPerson);
router.get("/connections", getConnections);
router.get("/connections/:id", getConnectionDetails);
router.get("/bills", getBills);
router.get("/bills/:id", getBillsById);
router.get("/usage", getUsageHistory);
router.post("/pay", makePayment);
router.get("/complaints", getComplaints);
router.post("/complaints", submitComplaint);
router.get("/applications", getApplications);
router.post("/applications", submitApplication);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/avatar", updateAvatar);
router.put("/password", changePassword);
router.put("/deactivate", deactivateAccount);
router.get("/payment-methods", getPaymentMethods);
router.post("/payment-methods", addPaymentMethod);
router.put("/payment-methods/:id/default", setDefaultPaymentMethod);
router.delete("/payment-methods/:id", deletePaymentMethod);
router.get("/payment-history", getPaymentHistory);
router.post("/recharge", createBillForRecharge);

module.exports = router;
