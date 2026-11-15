
const Report = require("../models/Report");

const REPORT_WINDOW_DAYS = 90;
const MAX_COMMUNITY_POINTS = 20;

// Initial community scoring rules
function calculateCommunityPoints(reportCount) {
    if (reportCount === 0) return 0;
    if (reportCount === 1) return 5;
    if (reportCount <= 4) return 10;
    if (reportCount <= 9) return 15;

    return MAX_COMMUNITY_POINTS;
}

// Normalize descriptions to identify repeated claims
function normalizeDescription(description) {
    return (description || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

// Analyze community reports for a website
const checkCommunityReports = async (domain) => {
    try {
        if (!domain || typeof domain !== "string") {
            throw new Error("A valid domain is required");
        }

        const normalizedDomain = domain.toLowerCase().trim();

        const cutoffDate = new Date(
            Date.now() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000
        );

        // Fetch approved reports from the last 90 days
        const reports = await Report.find({
            domain: normalizedDomain,
            status: "approved",
            createdAt: { $gte: cutoffDate }
        })
            .select("reason description createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // Group reports with the same reason and normalized description.
        // Each group contributes only one report to the score.
        const uniqueClaims = new Map();

        for (const report of reports) {
            const description = normalizeDescription(report.description);

            const claimKey = `${report.reason}|${description}`;

            if (!uniqueClaims.has(claimKey)) {
                uniqueClaims.set(claimKey, report);
            }
        }

        const uniqueClaimCount = uniqueClaims.size;

        const points = calculateCommunityPoints(uniqueClaimCount);

        const reasons = [];

        if (uniqueClaimCount > 0) {
            reasons.push(
                `${uniqueClaimCount} distinct approved report claim(s) found in the last ${REPORT_WINDOW_DAYS} days`
            );
        } else {
            reasons.push(
                `No approved community reports found in the last ${REPORT_WINDOW_DAYS} days`
            );
        }

        return {
            points,
            reasons,
            failed: false,

            evidence: {
                domain: normalizedDomain,
                totalApprovedReports: reports.length,
                distinctApprovedClaims: uniqueClaimCount,
                reportWindowDays: REPORT_WINDOW_DAYS,
                maximumPoints: MAX_COMMUNITY_POINTS,

                reports: reports.map(report => ({
                    reason: report.reason,
                    description: report.description,
                    createdAt: report.createdAt
                }))
            }
        };

    } catch (error) {
        console.error("Community report check error:", error);

        return {
            points: 0,
            reasons: ["Community report check unavailable"],
            failed: true,

            evidence: {
                error: error.message
            }
        };
    }
};

module.exports = {
    checkCommunityReports,
    calculateCommunityPoints,
    normalizeDescription
};
