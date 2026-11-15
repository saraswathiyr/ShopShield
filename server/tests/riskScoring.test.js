
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    calculateRiskScore
} = require("../scoring/riskScoring");

const safeFactors = {
    urlSecurity: { points: 0, failed: false },
    domainAge: { points: 0, failed: false },
    reputation: { points: 0, failed: false },
    priceAnalysis: { points: 0, failed: false },
    contentAnalysis: { points: 0, failed: false },
    communityReports: { points: 0, failed: false }
};

test("All safe checks should return zero risk", () => {
    const result = calculateRiskScore(safeFactors);

    assert.equal(result.riskScore, 0);
    assert.equal(result.riskLevel, "Low Risk");
    assert.equal(result.confidence, 100);
});

test("All maximum scores should return 100 risk", () => {
    const factors = {
        urlSecurity: { points: 83 },
        domainAge: { points: 25 },
        reputation: { points: 40 },
        priceAnalysis: { points: 25 },
        contentAnalysis: { points: 44 },
        communityReports: { points: 20 }
    };

    const result = calculateRiskScore(factors);

    assert.equal(result.riskScore, 100);
    assert.equal(result.riskLevel, "High Risk");
});

test("Unavailable factors should reduce confidence", () => {
    const factors = {
        ...safeFactors,
        reputation: {
            points: 0,
            failed: true
        }
    };

    const result = calculateRiskScore(factors);

    assert.equal(result.confidence, 75);
    assert.equal(result.analysisStatus, "partial");
});

test("No available factors should return unknown risk", () => {
    const factors = {
        urlSecurity: { failed: true },
        domainAge: { failed: true },
        reputation: { failed: true },
        priceAnalysis: { failed: true },
        contentAnalysis: { failed: true },
        communityReports: { failed: true }
    };

    const result = calculateRiskScore(factors);

    assert.equal(result.riskScore, null);
    assert.equal(result.riskLevel, "Unknown");
});

test("Invalid negative points should not contribute", () => {
    const factors = {
        ...safeFactors,
        urlSecurity: { points: -10 }
    };

    const result = calculateRiskScore(factors);

    assert.equal(result.factors.urlSecurity.status, "unavailable");
    assert.equal(result.confidence, 85);
});

test("Risk score should never exceed 100", () => {
    const factors = {
        ...safeFactors,
        urlSecurity: { points: 1000 }
    };

    const result = calculateRiskScore(factors);

    assert.ok(result.riskScore <= 100);
});

test("Uses configured factor weights and adjusts confidence proportionally", () => {
    const factors = {
        ...safeFactors,
        reputation: { points: 40, failed: false },
        domainAge: { points: 25, failed: true }
    };

    const result = calculateRiskScore(factors);

    assert.equal(result.riskScore, 29);
    assert.equal(result.confidence, 85);
    assert.equal(
        result.factors.reputation.weightedContribution,
        25
    );
    assert.equal(result.factors.domainAge.status, "unavailable");
});

test("Classifies exact low, medium, and high risk boundaries", () => {
    const resultForRiskScore = targetScore => {
        const factors = {
            urlSecurity: { points: targetScore * 0.83 },
            domainAge: { points: targetScore * 0.25 },
            reputation: { points: targetScore * 0.4 },
            priceAnalysis: { points: targetScore * 0.25 },
            contentAnalysis: { points: targetScore * 0.44 },
            communityReports: { points: targetScore * 0.2 }
        };

        return calculateRiskScore(factors);
    };

    assert.equal(resultForRiskScore(30).riskLevel, "Low Risk");
    assert.equal(resultForRiskScore(31).riskLevel, "Medium Risk");
    assert.equal(resultForRiskScore(60).riskLevel, "Medium Risk");
    assert.equal(resultForRiskScore(61).riskLevel, "High Risk");
});
