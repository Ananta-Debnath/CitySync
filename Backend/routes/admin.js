const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const adminController = require('../controllers/adminController');

router.use(authMiddleware);
router.use(roleMiddleware(['employee']));

// Dashboard
router.get('/tables', adminController.getTables);

// Regions
router.get('/regions', adminController.getRegions);
router.post('/regions', adminController.createRegion);
router.put('/regions/:id', adminController.updateRegion);
router.delete('/regions/:id', adminController.deleteRegion);

// Read-only lookups
router.get('/addresses', adminController.getAddresses);
router.get('/persons', adminController.getPersons);
router.get('/utilities', adminController.getUtilities);

// Consumers
router.get('/consumers', adminController.getConsumers);
router.put('/consumers/:id', adminController.updateConsumer);

// Employees & field workers
router.get('/employees', adminController.getEmployees);
router.get('/field-workers', adminController.getFieldWorkers);

// Tariffs
router.get('/tariffs', adminController.getTariffs);
router.post('/tariffs', adminController.createTariff);
router.put('/tariffs/:id', adminController.updateTariff);

// Tariff slabs
router.get('/tariffs/:id/slabs', adminController.getTariffSlabs);
router.post('/tariffs/:id/slabs', adminController.createTariffSlab);
router.put('/tariffs/:id/slabs/:slabNum', adminController.updateTariffSlab);
router.delete('/tariffs/:id/slabs/:slabNum', adminController.deleteTariffSlab);

// Fixed charges
router.get('/tariffs/:id/fixed-charges', adminController.getTariffFixedCharges);
router.post('/tariffs/:id/fixed-charges', adminController.createTariffFixedCharge);
router.delete('/tariffs/:id/fixed-charges/:fcId', adminController.deleteTariffFixedCharge);

// Meters
router.get('/meters', adminController.getMeters);
router.post('/meters', adminController.createMeter);

// Connections
router.get('/connections', adminController.getConnections);
router.post('/connections', adminController.createConnection);
router.put('/connections/:id/status', adminController.updateConnectionStatus);

// Applications
router.get('/applications', adminController.getApplications);
router.put('/applications/:id/status', adminController.updateApplicationStatus);

// Complaints
router.get('/complaints', adminController.getComplaints);
router.put('/complaints/:id/assign', adminController.assignComplaint);
router.put('/complaints/:id/status', adminController.updateComplaintStatus);

// Billing
router.get('/bills', adminController.getBills);
router.post('/bills/generate', adminController.generateBill);
router.put('/bills/:id/status', adminController.updateBillStatus);

// Payments
router.get('/payments', adminController.getPayments);

// Generic table access
router.get('/table/:tableName', adminController.getTableData);
router.delete('/table/:tableName/:id', adminController.deleteTableRow);

// Profile
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.put('/avatar', adminController.updateAvatar);
router.delete('/avatar', adminController.deleteAvatar);
router.put('/password', adminController.updatePassword);

module.exports = router;
