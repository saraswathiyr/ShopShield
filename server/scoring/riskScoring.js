
const FACTOR_CONFIG = {
    urlSecurity: {
        label: "URL Security",
        maxPoints: 83,
        weight: 15
    },
    domainAge: {
        label: "Domain Age",
        maxPoints: 25,
        weight: 15
    },
    reputation: {
        label: "Website Reputation",
        maxPoints: 40,
        weight: 25
    },
    priceAnalysis: {
        label: "Price Analysis",
        maxPoints: 25,
        weight: 15
    },
    contentAnalysis: {
        label: "Website Content",
        maxPoints: 44,
        weight: 15
    },
    communityReports: {
        label: "Community Reports",
        maxPoints: 20,
        weight: 15
    }
};

const TOTAL_WEIGHT = Object.values(FACTOR_CONFIG)
    .reduce((sum, factor) => sum + factor.weight, 0);

// Calculate final website risk score
function calculateRiskScore(factorResults) {
    let weightedPoints = 0;
    let availableWeight = 0;

    const factorDetails = {};

    for (const [key, config] of Object.entries(FACTOR_CONFIG)) {
        const result = factorResults[key];

        if (!result || result.failed === true) {
            factorDetails[key] = {
                name: config.label,
                points: null,
                weight: config.weight,
                status: "unavailable",
                reasons: result?.reasons || ["Check unavailable"]
            };

            continue;
        }

        const rawPoints = Number(result.points);

        if (
            !Number.isFinite(rawPoints) ||
            rawPoints < 0
        ) {
            factorDetails[key] = {
                name: config.label,
                points: null,
                weight: config.weight,
                status: "unavailable",
                reasons: ["Invalid scoring result"]
            };

            continue;
        }

        const points = Math.min(rawPoints, config.maxPoints);

        const normalizedPoints =
            (points / config.maxPoints) * config.weight;

        weightedPoints += normalizedPoints;
        availableWeight += config.weight;

        factorDetails[key] = {
            name: config.label,
            points,
            maximumPoints: config.maxPoints,
            weight: config.weight,
            weightedContribution: Number(
                normalizedPoints.toFixed(2)
            ),
            status: "completed",
            reasons: result.reasons || [],
            evidence: result.evidence || {}
        };
    }

    // No available checks means no reliable score.
    if (availableWeight === 0) {
        return {
            success: false,
            message: "Unable to calculate risk score.",
            riskScore: null,
            riskLevel: "Unknown",
            confidence: 0,
            completedFactors: 0,
            totalFactors: Object.keys(FACTOR_CONFIG).length,
            factors: factorDetails
        };
    }

    // Normalize against successfully completed factor weights.
    const riskScore = Math.round(
        (weightedPoints / availableWeight) * 100
    );

    const confidence = Math.round(
        (availableWeight / TOTAL_WEIGHT) * 100
    );

    let riskLevel;

    if (riskScore <= 30) {
        riskLevel = "Low Risk";
    } else if (riskScore <= 60) {
        riskLevel = "Medium Risk";
    } else {
        riskLevel = "High Risk";
    }

    const completedFactors = Object.values(factorDetails)
        .filter(factor => factor.status === "completed").length;

    return {
        success: true,
        riskScore,
        riskLevel,
        confidence,
        completedFactors,
        totalFactors: Object.keys(FACTOR_CONFIG).length,
        analysisStatus:
            completedFactors === 6 ? "complete" : "partial",
        factors: factorDetails
    };
}

module.exports = {
    calculateRiskScore,
    FACTOR_CONFIG
};
