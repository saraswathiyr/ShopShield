
const express = require("express");
const router = express.Router();

const adminAuth = require("../middleware/adminAuth");

const {
    getReports,
    reviewReport
} = require("../controllers/adminReportController");

router.use(adminAuth);

router.get("/reports", getReports);

router.patch("/reports/:id", reviewReport);

module.exports = router;
