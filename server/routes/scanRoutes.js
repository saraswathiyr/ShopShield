
const express = require("express");
const router = express.Router();

const {
    scanWebsite
} = require("../controllers/scanController");
const scanRateLimiter = require("../middleware/scanRateLimiter");

router.post("/", scanRateLimiter, scanWebsite);

module.exports = router;
