
const Joi = require("joi");
const mongoose = require("mongoose");
const { parse } = require("tldts");
const { isIP } = require("node:net");

const Report = require("../models/Report");

// 1. Validate incoming report data
const reportSchema = Joi.object({
    url: Joi.string()
        .trim()
        .min(8)
        .max(2048)
        .required(),

    reason: Joi.string()
        .valid(
            "Fake payment page",
            "Fake discounts",
            "Phishing",
            "Product scam",
            "Non-delivery",
            "Other"
        )
        .required(),

    description: Joi.string()
        .trim()
        .max(500)
        .allow("")
        .default("")
});

// 2. Extract and normalize the main domain
function extractDomain(input) {
    if (typeof input !== "string" || !input.trim()) {
        throw new Error("URL is missing or empty");
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(input.trim());
    } catch (error) {
        throw new Error("Invalid URL format: " + error.message);
    }

    if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
    ) {
        throw new Error("Only HTTP and HTTPS URLs are allowed");
    }

    if (parsedUrl.username || parsedUrl.password) {
        throw new Error("URLs containing credentials are not allowed");
    }

    if (!parsedUrl.hostname) {
        throw new Error("Website hostname is missing");
    }

    const hostname = parsedUrl.hostname
        .toLowerCase()
        .replace(/\.$/, "");

    const ipVersion = isIP(hostname);

    const domainInfo = parse(hostname);

    const domain = ipVersion
        ? hostname
        : domainInfo.domain || hostname;

    return {
        hostname,
        domain
    };
}

// 3. Submit a community report
const submitReport = async (req, res) => {
    try {
        console.log("Received report request");

        // Validate request body
       const { error, value } = reportSchema.validate(req.body || {}, {
            abortEarly: true,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        console.log("Received URL:", value.url);

        // Extract domain
        let domainInfo;

        try {
            domainInfo = extractDomain(value.url);
        } catch (error) {
            console.error("Domain extraction error:", error.message);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        const { domain, hostname } = domainInfo;

        console.log("Normalized domain:", domain);

        // Check MongoDB connection
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                message: "Database is not connected. Please try again later."
            });
        }

        // Check for an identical report submitted in the last 24 hours
        const twentyFourHoursAgo = new Date(
            Date.now() - 24 * 60 * 60 * 1000
        );

        const duplicate = await Report.findOne({
            domain,
            reason: value.reason,
            description: value.description,
            createdAt: {
                $gte: twentyFourHoursAgo
            }
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: "A similar report was submitted for this website recently."
            });
        }

        // Save report in MongoDB
        const report = await Report.create({
            domain,
            reason: value.reason,
            description: value.description,
            status: "pending"
        });

        console.log("Report saved successfully:", report._id);

        return res.status(201).json({
            success: true,
            message: "Your report has been submitted for review.",
            report: {
                id: report._id,
                domain: report.domain,
                reason: report.reason,
                description: report.description,
                status: report.status,
                createdAt: report.createdAt
            }
        });

    } catch (error) {
        console.error("Report submission error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit report. Please try again later."
        });
    }
};

module.exports = {
    submitReport
};
