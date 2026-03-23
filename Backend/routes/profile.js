const express = require("express");
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

const { getPerson } = require('../controllers/profileController');

router.get("/me", getPerson);

module.exports = router;