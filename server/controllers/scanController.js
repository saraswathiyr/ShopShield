
const Joi = require("joi");

const {
    fetchWebsiteHTML
} = require("../services/websiteFetchService");

const analyzeWebsite = require("../services/websiteAnalysisService");

// Validate scan request
const scanSchema = Joi.object({
    url: Joi.string()
        .trim()
        .min(8)
        .max(2048)
        .required()
});

// POST: Scan a shopping website
const scanWebsite = async (req, res) => {
    try {
        // 1. Validate input
        const { error, value } = scanSchema.validate(req.body || {});

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const requestedUrl = value.url;

        // 2. Fetch website HTML safely
        const fetchResult = await fetchWebsiteHTML(requestedUrl);

        if (!fetchResult.success) {
            return res.status(422).json({
                success: false,
                message: "Unable to scan this website.",
                reason: fetchResult.message
            });
        }

        // 3. Analyze the final URL and fetched HTML
        const analysis = await analyzeWebsite(
            fetchResult.finalUrl,
            fetchResult.html
        );

        if (!analysis.success) {
            return res.status(503).json({
                success: false,
                message: "Website analysis could not be completed.",
                analysis
            });
        }

        // 4. Return complete analysis
        return res.status(200).json({
            success: true,
            message: "Website analysis completed successfully.",
            requestedUrl,
            finalUrl: fetchResult.finalUrl,
            scan: analysis
        });

    } catch (error) {
        console.error("Website scan error:", error);

        return res.status(500).json({
            success: false,
            message: "An unexpected error occurred during website scanning."
        });
    }
};

module.exports = {
    scanWebsite
};
