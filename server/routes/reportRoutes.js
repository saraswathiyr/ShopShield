
const express = require("express");
const router = express.Router();

const {
    submitReport
} = require("../controllers/reportController");

const reportRateLimiter = require("../middleware/reportRateLimiter");

// Apply rate limiting to report submissions
router.post("/", reportRateLimiter, submitReport);

module.exports = router;
