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
router.post('/regions', adminController.createRegion);
router.put('/regions/:id/capacity', adminController.updateRegionCapacity);
router.get('/regions/:id/utilities', adminController.getRegionUtilities);
router.put('/regions/:id/utilities/:utilityId', adminController.updateRegionUtilityAvailability);
router.put('/regions/:id', adminController.updateRegion);
router.delete('/regions/:id', adminController.deleteRegion);

// Analytics
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/workers', adminController.getWorkerAnalytics);
router.get('/analytics/regions', adminController.getRegionalAnalytics);

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
router.put('/tariffs/:id/deactivate', adminController.deactivateTariff);
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
router.post('/complaints/:id/assign', adminController.assignComplaintAuto);
router.put('/complaints/:id/status', adminController.updateComplaintStatus);
router.post('/complaints/:id/approve-change', adminController.approveComplaintChange);

// Billing
router.get('/bills', adminController.getBills);
router.post('/bills/generate', adminController.generateBill);
router.post('/bills/generate-monthly', adminController.generateMonthlyBills);
router.put('/bills/:id/status', adminController.updateBillStatus);

// Payments
router.get('/payments', adminController.getPayments);

// Readings
router.get('/readings', adminController.getReadings);
router.get('/readings/:id', adminController.getReadingById);
router.post('/readings/:id/approve', adminController.approveReading);

// Generic table access
router.get('/table/:tableName', adminController.getTableData);
router.delete('/table/:tableName/:id', adminController.deleteTableRow);

// Profile
router.get('/profile', adminController.getProfile);
// router.put('/profile', adminController.updateProfile);
// router.put('/avatar', adminController.updateAvatar);
// router.delete('/avatar', adminController.deleteAvatar);
// router.put('/password', adminController.updatePassword);

module.exports = router;
