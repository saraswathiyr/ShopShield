
const axios = require("axios");
const normalizeDomain = require("../utils/normalizeDomain");

const GOOGLE_API_URL =
    "https://safebrowsing.googleapis.com/v4/threatMatches:find";

const VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/urls";

function getErrorMessage(error) {
    return error?.response?.data?.error?.message ||
        error?.message ||
        "Reputation service request failed.";
}

function getVirusTotalStats(attributes) {
    const stats = attributes.last_analysis_stats;

    if (!stats || typeof stats !== "object") {
        return null;
    }

    const statNames = [
        "malicious",
        "suspicious",
        "harmless",
        "undetected"
    ];

    if (!statNames.some(name => Object.hasOwn(stats, name))) {
        return null;
    }

    const parsedStats = Object.fromEntries(
        statNames.map(name => [name, Number(stats[name] || 0)])
    );

    if (
        Object.values(parsedStats).some(
            value => !Number.isFinite(value) || value < 0
        )
    ) {
        throw new Error("VirusTotal returned invalid analysis statistics.");
    }

    return parsedStats;
}

function createVirusTotalPendingResult(analysisId) {
    return {
        source: "VirusTotal",
        status: "pending-analysis",
        failed: false,
        analysisId: typeof analysisId === "string" ? analysisId : null
    };
}

// Check Google Safe Browsing.
async function checkGoogleSafeBrowsing(inputUrl) {
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

    if (!apiKey) {
        throw new Error("Google Safe Browsing API key is missing");
    }

    const response = await axios.post(
        `${GOOGLE_API_URL}?key=${encodeURIComponent(apiKey)}`,
        {
            client: {
                clientId: "shopshield",
                clientVersion: "1.0.0"
            },
            threatInfo: {
                threatTypes: [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION"
                ],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: [{ url: inputUrl }]
            }
        },
        { timeout: 10000 }
    );

    const matches = response.data.matches || [];

    return {
        source: "Google Safe Browsing",
        status: matches.length ? "threat-found" : "no-match",
        malicious: matches.length > 0,
        detections: matches.length
    };
}

// Check an existing VirusTotal URL report, submitting unknown URLs for analysis.
async function checkVirusTotal(inputUrl) {
    const apiKey = process.env.VIRUSTOTAL_API_KEY;

    if (!apiKey) {
        throw new Error("VirusTotal API key is missing");
    }

    // VirusTotal URL IDs use URL-safe Base64 without padding.
    const urlId = Buffer
        .from(inputUrl)
        .toString("base64url");

    const requestConfig = {
        timeout: 15000,
        headers: {
            "x-apikey": apiKey,
            Accept: "application/json"
        }
    };

    let response;

    try {
        response = await axios.get(
            `${VIRUSTOTAL_URL}/${urlId}`,
            requestConfig
        );
    } catch (error) {
        if (error.response?.status !== 404) {
            throw error;
        }

        const submission = await axios.post(
            VIRUSTOTAL_URL,
            new URLSearchParams({ url: inputUrl }),
            requestConfig
        );

        const analysis = submission.data?.data;
        const attributes = analysis?.attributes || {};
        const stats = getVirusTotalStats(attributes);

        if (attributes.status === "completed" && stats) {
            return {
                source: "VirusTotal",
                status: "report-found",
                ...stats
            };
        }

        return createVirusTotalPendingResult(analysis?.id);
    }

    const data = response.data?.data;
    const attributes = data?.attributes;

    if (!attributes || typeof attributes !== "object") {
        throw new Error("VirusTotal returned an invalid URL report.");
    }

    const stats = getVirusTotalStats(attributes);

    if (!stats) {
        return createVirusTotalPendingResult();
    }

    return {
        source: "VirusTotal",
        status: "report-found",
        ...stats
    };
}

// Main reputation check.
async function reputationCheck(inputUrl) {
    try {
        normalizeDomain(inputUrl);

        const normalizedUrl = new URL(inputUrl).href;

        // Run both sources independently so one failure
        // does not prevent the other source from responding.
        const results = await Promise.allSettled([
            checkGoogleSafeBrowsing(normalizedUrl),
            checkVirusTotal(normalizedUrl)
        ]);

        const sources = results.map((result, index) => {
            const sourceName = index === 0
                ? "Google Safe Browsing"
                : "VirusTotal";

            if (result.status === "fulfilled") {
                return {
                    ...result.value,
                    failed: false
                };
            }

            return {
                source: sourceName,
                status: "unavailable",
                failed: true,
                message: getErrorMessage(result.reason)
            };
        });

        const completedSources = sources.filter(
            source =>
                !source.failed &&
                ["no-match", "report-found", "threat-found"].includes(
                    source.status
                )
        );

        const pendingSources = sources.filter(
            source => source.status === "pending-analysis"
        );

        const googleThreat = sources.some(
            source =>
                source.source === "Google Safe Browsing" &&
                source.malicious === true
        );

        const virusTotalThreat = sources.some(
            source =>
                source.source === "VirusTotal" &&
                source.malicious > 0
        );

        // Use the strongest source result rather than adding
        // detections from overlapping threat databases.
        const confirmedThreat = googleThreat || virusTotalThreat;

        const points = confirmedThreat ? 40 : 0;
        const hasCompletedSource = completedSources.length > 0;

        const reasons = [];

        if (googleThreat) {
            reasons.push(
                "Google Safe Browsing identified a potential threat"
            );
        }

        if (virusTotalThreat) {
            reasons.push(
                "VirusTotal reported malicious security detections"
            );
        }

        if (
            !confirmedThreat &&
            hasCompletedSource
        ) {
            reasons.push(
                "No malicious match was found in the available reputation reports"
            );
        }

        return {
            points,
            reasons,
            failed: !hasCompletedSource,

            evidence: {
                status: confirmedThreat
                    ? "threat-found"
                    : hasCompletedSource
                        ? "no-match"
                        : pendingSources.length > 0
                            ? "analysis-pending"
                            : "unavailable",

                sources,
                successfulSourceCount: completedSources.length,
                pendingSourceCount: pendingSources.length,
                totalSourceCount: sources.length
            }
        };

    } catch (error) {
        return {
            points: 0,
            reasons: [],
            failed: true,
            evidence: {
                status: "unavailable",
                message: getErrorMessage(error)
            }
        };
    }
}

module.exports = reputationCheck;
