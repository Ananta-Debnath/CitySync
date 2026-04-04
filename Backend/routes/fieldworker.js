const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const fieldworkerController = require('../controllers/fieldworkerController');

router.use(authMiddleware);
router.use(roleMiddleware(['field_worker']));

// Dashboard
router.get('/dashboard', fieldworkerController.getDashboard);

// Jobs
router.get('/jobs', fieldworkerController.getJobs);
router.put('/jobs/:id/status', fieldworkerController.updateJobStatus);

// Complaints (alias for jobs, used by MyJobs UI)
router.get('/complaints', fieldworkerController.getJobs);
router.put('/complaints/:id', fieldworkerController.updateJobStatus);

// Meter reading related
router.get('/connections', fieldworkerController.getConnections);
router.get('/meters/stats', fieldworkerController.getMeterStats);
router.get('/meters', fieldworkerController.getMeters);
router.post('/meters', fieldworkerController.createMeter);
router.get('/tariffs', fieldworkerController.getTariffs);
router.get('/tariffs/:tariff_id/slabs', fieldworkerController.getTariffSlabs);
router.get('/readings', fieldworkerController.getReadings);
router.post('/readings', fieldworkerController.submitReading);

// Profile
router.get('/profile', fieldworkerController.getProfile);
// router.put('/profile', fieldworkerController.updateProfile);
// router.put('/avatar', fieldworkerController.updateAvatar);
// router.delete('/avatar', fieldworkerController.deleteAvatar);
// router.put('/password', fieldworkerController.updatePassword);

module.exports = router;
