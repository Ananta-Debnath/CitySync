const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const fieldworkerController = require('../controllers/fieldworkerController');

router.use(authMiddleware);
router.use(roleMiddleware(['field_worker']));

// Jobs
router.get('/jobs', fieldworkerController.getJobs);
router.put('/jobs/:id/status', fieldworkerController.updateJobStatus);

// Meter reading related
router.get('/connections', fieldworkerController.getConnections);
router.post('/readings', fieldworkerController.submitReading);

// Profile
router.get('/profile', fieldworkerController.getProfile);
router.put('/profile', fieldworkerController.updateProfile);
router.put('/avatar', fieldworkerController.updateAvatar);
router.put('/password', fieldworkerController.updatePassword);

module.exports = router;
