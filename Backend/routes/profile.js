const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const profileController = require('../controllers/profileController');

router.get("/me", profileController.getPerson);
// router.get('/profile', profileController.getProfile);
router.put('/profile', profileController.updateProfile);
router.put('/avatar', profileController.updateAvatar);
router.delete('/avatar', profileController.deleteAvatar);
router.put('/password', profileController.updatePassword);

module.exports = router;