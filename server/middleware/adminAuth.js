
const crypto = require("node:crypto");

const adminAuth = (req, res, next) => {
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = req.headers["x-admin-key"];

    if (!adminSecret) {
        console.error("ADMIN_SECRET is not configured.");

        return res.status(500).json({
            success: false,
            message: "Admin authentication is not configured."
        });
    }

    if (
        typeof providedSecret !== "string" ||
        Buffer.byteLength(providedSecret) !== Buffer.byteLength(adminSecret)
    ) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Invalid admin credentials."
        });
    }

    const isValid = crypto.timingSafeEqual(
        Buffer.from(providedSecret),
        Buffer.from(adminSecret)
    );

    if (!isValid) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Invalid admin credentials."
        });
    }

    next();
};

module.exports = adminAuth;
