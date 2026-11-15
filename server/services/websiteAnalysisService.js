
const urlCheck = require("./urlCheck");
const domainAgeCheck = require("./domainAgeCheck");
const reputationCheck = require("./reputationCheck");
const priceCheck = require("./priceCheck");
const contentCheck = require("./contentCheck");

const {
    checkCommunityReports
} = require("./communityReportService");

const {
    discoverDomainPages
} = require("./domainPageDiscovery");

const normalizeDomain = require("../utils/normalizeDomain");

const {
    calculateRiskScore
} = require("../scoring/riskScoring");

// Analyze a website using all six detection factors.
async function analyzeWebsite(url, html) {
    try {
        if (typeof url !== "string" || !url.trim()) {
            throw new Error("A valid website URL is required.");
        }

        if (typeof html !== "string" || !html.trim()) {
            throw new Error("Website HTML content is required.");
        }

        const domainInfo = normalizeDomain(url);
        const domain = domainInfo.domain;

        // Discover additional pages for domain-wide content analysis.
        const domainPagesPromise = discoverDomainPages(url, html);

        const results = await Promise.allSettled([
            Promise.resolve().then(() => urlCheck(url)),
            Promise.resolve().then(() => domainAgeCheck(url)),
            Promise.resolve().then(() => reputationCheck(url)),
            Promise.resolve().then(() => priceCheck(html)),

            domainPagesPromise.then(domainPages => {
                const htmlPages = domainPages.pages.map(page => page.html);

                const contentResult = contentCheck(htmlPages);

                // Keep page discovery details visible in the evidence.
                if (contentResult.evidence) {
                    contentResult.evidence.domainPageDiscovery = {
                        success: domainPages.success,
                        pagesAnalyzed: domainPages.pagesAnalyzed,
                        maximumPages: domainPages.maximumPages,
                        pages: domainPages.pages.map(page => ({
                            url: page.url,
                            source: page.source
                        })),
                        failedPages: domainPages.failedPages
                    };
                }

                return contentResult;
            }),

            Promise.resolve().then(() =>
                checkCommunityReports(domain)
            )
        ]);

        const factorNames = [
            "urlSecurity",
            "domainAge",
            "reputation",
            "priceAnalysis",
            "contentAnalysis",
            "communityReports"
        ];

        const factorResults = {};

        results.forEach((result, index) => {
            const factorName = factorNames[index];

            if (result.status === "fulfilled") {
                factorResults[factorName] = result.value;
            } else {
                console.error(
                    `${factorName} failed:`,
                    result.reason
                );

                factorResults[factorName] = {
                    points: 0,
                    reasons: [
                        "This detection check is unavailable."
                    ],
                    failed: true
                };
            }
        });

        const scoringResult = calculateRiskScore(factorResults);

        return {
            success: scoringResult.success,
            website: {
                url,
                domain
            },
            ...scoringResult
        };

    } catch (error) {
        console.error("Website analysis error:", error);

        return {
            success: false,
            message: error.message,
            riskScore: null,
            riskLevel: "Unknown",
            confidence: 0
        };
    }
}

module.exports = analyzeWebsite;
