const rateLimit = require("express-rate-limit");

const scanRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many scan requests. Please try again after 15 minutes."
    }
});

module.exports = scanRateLimiter;
