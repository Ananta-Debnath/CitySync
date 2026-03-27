const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const consumerController = require('../controllers/consumerController');

router.use(authMiddleware);
router.use(roleMiddleware(['consumer']));

router.get("/connections", consumerController.getConnections);
router.get("/connections/:id", consumerController.getConnectionDetails);
router.get("/bills", consumerController.getBills);
router.get("/bills/:id", consumerController.getBillsById);
router.get("/usage", consumerController.getUsageHistory);
router.post("/pay", consumerController.makePayment);
router.get("/complaints", consumerController.getComplaints);
router.post("/complaints", consumerController.submitComplaint);
router.get("/applications", consumerController.getApplications);
router.post("/applications", consumerController.submitApplication);
router.get("/profile", consumerController.getProfile);
router.put("/profile", consumerController.updateProfile);
router.put("/avatar", consumerController.updateAvatar);
router.delete("/avatar", consumerController.deleteAvatar);
router.put("/password", consumerController.changePassword);
router.put("/deactivate", consumerController.deactivateAccount);
router.get("/payment-methods", consumerController.getPaymentMethods);
router.post("/payment-methods", consumerController.addPaymentMethod);
router.put("/payment-methods/:id/default", consumerController.setDefaultPaymentMethod);
router.delete("/payment-methods/:id", consumerController.deletePaymentMethod);
router.get("/payment-history", consumerController.getPaymentHistory);
router.post("/recharge", consumerController.createBillForRecharge);

module.exports = router;
