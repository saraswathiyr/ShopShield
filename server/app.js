
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const reportRoutes = require("./routes/reportRoutes");

const app = express();
const adminReportRoutes = require("./routes/adminReportRoutes");
const scanRoutes = require("./routes/scanRoutes");
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
    origin: (origin, callback) => {
        callback(null, !origin || allowedOrigins.includes(origin));
    }
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({
    extended: false,
    limit: "10kb",
    parameterLimit: 100
}));

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "ShopShield API is running"
    });
});

// Report routes
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminReportRoutes);
app.use("/api/scan", scanRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body exceeds the 10kb limit."
        });
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Request body contains invalid JSON."
        });
    }

    console.error("API request error:", error);

    return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

module.exports = app;
