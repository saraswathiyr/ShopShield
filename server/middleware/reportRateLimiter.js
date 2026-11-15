
const rateLimit = require("express-rate-limit");

const reportRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes

    limit: 5, // Maximum 5 requests per IP

    standardHeaders: "draft-8",
    legacyHeaders: false,

    message: {
        success: false,
        message: "Too many report submissions. Please try again after 15 minutes."
    },

    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            message: "Too many report submissions. Please try again after 15 minutes."
        });
    }
});

module.exports = reportRateLimiter;
